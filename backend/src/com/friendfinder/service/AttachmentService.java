package com.friendfinder.service;

import java.io.*;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import com.friendfinder.dao.*;
import com.friendfinder.model.*;
import com.friendfinder.util.*;

/** Private files are written before the transaction and removed if it fails. */
public final class AttachmentService {
    private final AttachmentDAO attachments=new AttachmentDAO();
    private final Path root;
    public AttachmentService() throws IOException {
        root=Path.of(Config.get("upload.path","data/uploads")).toAbsolutePath().normalize();
        Path frontend=Path.of(Config.get("frontend.path","frontend")).toAbsolutePath().normalize();
        if(root.startsWith(frontend)) throw new IOException("Uploads must be outside frontend");
        for(String folder:List.of("messages","posts")) {
            Path path=root.resolve(folder);Files.createDirectories(path);
            for(Path part=path;part!=null;part=part.getParent()) if(Files.isSymbolicLink(part)) throw new IOException("Linked storage is not supported");
            if(!path.toRealPath().equals(path)) throw new IOException("Invalid storage directory");
        }
    }
    private Path file(PhotoAttachment photo) throws IOException {
        if(!photo.storedFilename().matches("[a-f0-9-]{36}\\.png")) throw new IOException("Invalid storage key");
        Path folder=root.resolve(photo.messageId()!=null?"messages":"posts"),path=folder.resolve(photo.storedFilename());
        if(!path.getParent().equals(folder) || Files.isSymbolicLink(path) || Files.isSymbolicLink(folder) || !folder.toRealPath().equals(folder)) throw new IOException("Invalid storage file");
        return path;
    }
    public long submit(User actor,boolean message,Map<String,Object> fields,List<byte[]> sources) throws SQLException,IOException {
        AuthService.member(actor);
        ApiException.require(!sources.isEmpty() && sources.size()<=(message?1:4),400,"Choose "+(message?"one photo":"one to four photos"));
        long target=Input.id(fields,message?"conversationId":"communityId");
        String body=Input.text(fields,"body",0,message?4000:10000);
        String title=message?"":Input.text(fields,"title",0,160);
        // Deny an unauthorized target before decoding or writing any photo.
        try(Connection connection=DatabaseConnection.open()) {
            if(message) new MessageService().requirePhotoAccess(connection,actor,target);
            else new CommunityService().requireMember(connection,actor.getId(),target);
        }
        List<PhotoAttachment> stored=new ArrayList<>();
        try {
            for(byte[] source:sources) {
                byte[] bytes=AttachmentPhotoProcessor.validatePhoto(source);
                var photo=new PhotoAttachment(0,actor.getId(),message?target:null,message?null:target,stored.size(),UUID.randomUUID()+".png","image/png",bytes.length);
                try(OutputStream output=Files.newOutputStream(file(photo),StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE)) {
                    // Track after exclusive creation, before writing, to clean up partial writes.
                    stored.add(photo);output.write(bytes);
                }
            }
            return Jdbc.transaction(connection->{
                long id=message?new MessageService().send(connection,actor,target,body,true):new PostService().submit(connection,actor,target,title,body,true);
                for(var photo:stored) attachments.saveAttachmentRecord(connection,new PhotoAttachment(0,actor.getId(),message?id:null,message?null:id,photo.position(),photo.storedFilename(),photo.mimeType(),photo.byteSize()));
                return id;
            });
        } catch(SQLException|IOException|RuntimeException e) { for(var photo:stored) deletePhotoIfOrphaned(photo);throw e; }
    }
    private void deletePhotoIfOrphaned(PhotoAttachment photo) {
        try { Files.deleteIfExists(file(photo)); }
        catch(IOException e) { System.err.println("An unused attachment could not be cleaned up"); }
    }
    public boolean canViewAttachment(Connection connection,User actor,PhotoAttachment photo) throws SQLException {
        if(photo.messageId()!=null) {
            var message=Jdbc.first(Jdbc.query(connection,"SELECT conversation_id FROM messages WHERE id=?",photo.messageId()));
            if(message==null) return false;
            new MessageService().requirePhotoAccess(connection,actor,Jdbc.number(message,"conversation_id"));
            return true;
        }
        var post=Jdbc.first(Jdbc.query(connection,"SELECT p.author_id,p.status,c.leader_id FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.id=? AND c.active=TRUE",photo.postId()));
        if(post==null) return false;
        // Approved feeds are readable by authenticated members, as before.
        if("APPROVED".equals(post.get("status"))) return true;
        return Jdbc.number(post,"author_id")==actor.getId() ||
            (actor instanceof CommunityLeader && Jdbc.number(post,"leader_id")==actor.getId() && "PENDING".equals(post.get("status")));
    }
    public record Download(Path path,int size,String type) {}
    public Download getAttachment(User actor,long id) throws SQLException,IOException {
        AuthService.member(actor);
        try(Connection connection=DatabaseConnection.open()) {
            PhotoAttachment photo=attachments.getAttachment(connection,id);
            ApiException.require(photo!=null,404,"Photo unavailable");
            ApiException.require(canViewAttachment(connection,actor,photo),403,"You cannot view this photo");
            Path path=file(photo);
            ApiException.require(Files.isRegularFile(path,LinkOption.NOFOLLOW_LINKS) && Files.size(path)==photo.byteSize(),404,"Photo unavailable");
            return new Download(path,photo.byteSize(),photo.mimeType());
        }
    }
}
