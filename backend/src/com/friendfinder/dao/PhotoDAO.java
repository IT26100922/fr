package com.friendfinder.dao;

import java.sql.*;
import java.util.*;
import com.friendfinder.model.ProfilePhoto;

public final class PhotoDAO {
    /** Enrich only rows already authorized by their calling service/controller. */
    public static List<Map<String,Object>> decorate(List<Map<String,Object>> rows,Map<String,String> fields) throws SQLException {
        if(rows.isEmpty())return rows;
        try(Connection connection=com.friendfinder.util.DatabaseConnection.open()) {
            Map<Long,String> urls=new PhotoDAO().urls(connection);
            for(var row:rows)for(var field:fields.entrySet()) {
                Object id=row.get(field.getKey());
                row.put(field.getValue(),id instanceof Number n?urls.get(n.longValue()):null);
            }
        }
        return rows;
    }
    public ProfilePhoto find(Connection connection,long userId) throws SQLException {
        var row=Jdbc.first(Jdbc.query(connection,"SELECT user_id,file_key,width,height,byte_size FROM profile_photos WHERE user_id=?",userId));
        return row==null?null:new ProfilePhoto(Jdbc.number(row,"user_id"),(String)row.get("file_key"),(int)Jdbc.number(row,"width"),(int)Jdbc.number(row,"height"),(int)Jdbc.number(row,"byte_size"));
    }
    public void save(Connection connection,ProfilePhoto photo) throws SQLException {
        Jdbc.update(connection,"INSERT INTO profile_photos(user_id,file_key,width,height,byte_size) VALUES(?,?,?,?,?) ON CONFLICT (user_id) DO UPDATE SET file_key=EXCLUDED.file_key,width=EXCLUDED.width,height=EXCLUDED.height,byte_size=EXCLUDED.byte_size,updated_at=CURRENT_TIMESTAMP",photo.getUserId(),photo.getFileKey(),photo.getWidth(),photo.getHeight(),photo.getByteSize());
    }
    public void remove(Connection connection,long userId) throws SQLException { Jdbc.update(connection,"DELETE FROM profile_photos WHERE user_id=?",userId); }
    /** Batches only metadata; no member file paths or original filenames reach the browser. */
    public Map<Long,String> urls(Connection connection) throws SQLException {
        Map<Long,String> result=new HashMap<>();
        for(var row:Jdbc.query(connection,"SELECT p.user_id,p.file_key FROM profile_photos p JOIN users u ON u.id=p.user_id WHERE u.suspended=FALSE AND u.role<>'ADMIN'")) {
            long id=Jdbc.number(row,"user_id");String key=(String)row.get("file_key");result.put(id,"/api/photos?userId="+id+"&v="+key.substring(0,36));
        }
        return result;
    }
}
