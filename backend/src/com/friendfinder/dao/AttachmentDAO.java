package com.friendfinder.dao;

import java.sql.*;
import java.util.*;
import com.friendfinder.model.PhotoAttachment;

public final class AttachmentDAO {
    public long saveAttachmentRecord(Connection connection, PhotoAttachment photo) throws SQLException {
        return Jdbc.insert(connection,"INSERT INTO photo_attachments(owner_id,message_id,post_id,position,stored_filename,mime_type,byte_size) VALUES(?,?,?,?,?,?,?)",
            photo.ownerId(),photo.messageId(),photo.postId(),photo.position(),photo.storedFilename(),photo.mimeType(),photo.byteSize());
    }
    public PhotoAttachment getAttachment(Connection connection,long id) throws SQLException {
        var row=Jdbc.first(Jdbc.query(connection,"SELECT * FROM photo_attachments WHERE id=?",id));
        return row==null?null:new PhotoAttachment(id,Jdbc.number(row,"owner_id"),
            row.get("message_id")==null?null:Jdbc.number(row,"message_id"),
            row.get("post_id")==null?null:Jdbc.number(row,"post_id"),
            (int)Jdbc.number(row,"position"),(String)row.get("stored_filename"),(String)row.get("mime_type"),(int)Jdbc.number(row,"byte_size"));
    }
    /** One bounded query for each displayed batch, rather than one query per card. */
    public static List<Map<String,Object>> decorate(Connection connection,List<Map<String,Object>> rows,boolean messages) throws SQLException {
        for(var row:rows) row.put("attachments",new ArrayList<Map<String,Object>>());
        if(rows.isEmpty()) return rows;
        String column=messages?"message_id":"post_id";
        String placeholders=String.join(",",Collections.nCopies(rows.size(),"?"));
        Object[] ids=rows.stream().map(row->row.get("id")).toArray();
        Map<Long,Map<String,Object>> byId=new HashMap<>();
        for(var row:rows) byId.put(Jdbc.number(row,"id"),row);
        for(var photo:Jdbc.query(connection,"SELECT id,"+column+",position FROM photo_attachments WHERE "+column+" IN ("+placeholders+") ORDER BY position",ids)) {
            @SuppressWarnings("unchecked")
            var attachments=(List<Map<String,Object>>)byId.get(Jdbc.number(photo,column)).get("attachments");
            long id=Jdbc.number(photo,"id");
            attachments.add(Map.of("id",id,"url","/api/attachments/"+id));
        }
        return rows;
    }
    public static List<Map<String,Object>> decorate(List<Map<String,Object>> rows,boolean messages) throws SQLException {
        try(Connection connection=com.friendfinder.util.DatabaseConnection.open()) { return decorate(connection,rows,messages); }
    }
}
