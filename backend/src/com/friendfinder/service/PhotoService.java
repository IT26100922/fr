package com.friendfinder.service;

import java.io.*;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import com.friendfinder.dao.*;
import com.friendfinder.model.*;
import com.friendfinder.util.*;

/** File storage is separate from static assets. Every public operation takes the authenticated actor. */
public final class PhotoService {
    private final PhotoDAO photos=new PhotoDAO();
    private final Path root;
    public PhotoService() throws IOException {
        root=Path.of(Config.get("media.path","media/profile-photos")).toAbsolutePath().normalize();
        Path frontend=Path.of(Config.get("frontend.path","frontend")).toAbsolutePath().normalize();
        if(root.startsWith(frontend))throw new IOException("Media must not be stored under the static frontend");
        Files.createDirectories(root);
        for(Path part=root;part!=null;part=part.getParent())if(Files.isSymbolicLink(part))throw new IOException("Symbolic links are not valid media storage");
        if(!root.toRealPath().equals(root))throw new IOException("Media storage must resolve to its configured directory");
    }
    private Path file(ProfilePhoto photo) throws IOException {
        Path target=root.resolve(photo.getFileKey()).normalize();
        if(!target.getParent().equals(root) || Files.isSymbolicLink(target))throw new IOException("Invalid media file");
        return target;
    }
    private void cleanup(ProfilePhoto photo) {
        if(photo==null)return;
        try { Files.deleteIfExists(file(photo)); }
        catch(IOException e) { System.err.println("An unused profile photo could not be cleaned up"); }
    }
    public ProfilePhoto upload(User actor,InputStream input,String type) throws SQLException,IOException {
        AuthService.member(actor);
        var image=PhotoProcessor.process(input.readNBytes(PhotoProcessor.MAX_BYTES+1),type);
        ProfilePhoto next=new ProfilePhoto(actor.getId(),UUID.randomUUID()+".png",image.width(),image.height(),image.bytes().length);
        Files.write(file(next),image.bytes(),StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE);
        ProfilePhoto previous;
        try {
            previous=Jdbc.transaction(connection->{
                Jdbc.query(connection,"SELECT id FROM users WHERE id=? FOR UPDATE",actor.getId());
                ProfilePhoto old=photos.find(connection,actor.getId());photos.save(connection,next);
                new ActivityDAO().log(connection,new ActivityLog(actor.getId(),"PROFILE_PHOTO_UPDATE",null));return old;
            });
        } catch(SQLException|RuntimeException e) { cleanup(next);throw e; }
        cleanup(previous);return next;
    }
    public void remove(User actor) throws SQLException {
        AuthService.member(actor);
        ProfilePhoto previous=Jdbc.transaction(connection->{
            Jdbc.query(connection,"SELECT id FROM users WHERE id=? FOR UPDATE",actor.getId());
            ProfilePhoto old=photos.find(connection,actor.getId());ApiException.require(old!=null,409,"You do not have a profile photo to remove");
            photos.remove(connection,actor.getId());new ActivityDAO().log(connection,new ActivityLog(actor.getId(),"PROFILE_PHOTO_REMOVE",null));return old;
        });
        cleanup(previous);
    }
    public byte[] read(User actor,long userId,String version) throws SQLException,IOException {
        AuthService.member(actor);
        try(Connection connection=DatabaseConnection.open()) {
            var user=new UserDAO().find(connection,userId);
            ApiException.require(user!=null && !Jdbc.bool(user,"suspended") && !"ADMIN".equals(user.get("role")),404,"Photo unavailable");
            ProfilePhoto photo=photos.find(connection,userId);
            ApiException.require(photo!=null && (version==null || photo.getVersion().equals(version)),404,"Photo unavailable");
            Path target=file(photo);ApiException.require(Files.isRegularFile(target,LinkOption.NOFOLLOW_LINKS),404,"Photo unavailable");
            byte[] bytes=Files.readAllBytes(target);if(bytes.length!=photo.getByteSize())throw new IOException("Photo storage is inconsistent");return bytes;
        }
    }
}
