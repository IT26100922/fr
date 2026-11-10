package com.friendfinder.util;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;

/** Small bounded multipart reader. The caller limits concurrent uploads as well. */
public final class MultipartUpload {
    public final Map<String,Object> fields=new LinkedHashMap<>();
    public final List<byte[]> photos=new ArrayList<>();
    public static final int MAX_PHOTO_BYTES=5*1024*1024;
    private static final int FIELD_BYTES=40000, HEADER_BYTES=4096;
    private MultipartUpload() {}
    public static int photoLimit() {
        int limit=Integer.parseInt(Config.get("upload.max.bytes",String.valueOf(MAX_PHOTO_BYTES)));
        if(limit<1 || limit>MAX_PHOTO_BYTES) throw new IllegalArgumentException("Invalid upload.max.bytes setting");
        return limit;
    }
    public static MultipartUpload read(InputStream input,String contentType,String contentLength,int maxPhotos) throws IOException {
        var match=Pattern.compile("^multipart/form-data;\\s*boundary=(?:\"([A-Za-z0-9'()+_,./:=? -]{1,70})\"|([A-Za-z0-9'()+_,./:=?-]{1,70}))$",Pattern.CASE_INSENSITIVE).matcher(contentType==null?"":contentType);
        ApiException.require(match.matches(),400,"Send multipart/form-data with a boundary");
        String boundary=match.group(1)!=null?match.group(1):match.group(2);
        int maxRequest=maxPhotos*photoLimit()+65536;
        if(contentLength!=null) {
            long length;
            try { length=Long.parseLong(contentLength); } catch(NumberFormatException e) { throw new ApiException(400,"Invalid request length"); }
            ApiException.require(length>=0 && length<=maxRequest,413,"Upload request is too large");
        }
        byte[] bytes=input.readNBytes(maxRequest+1);
        ApiException.require(bytes.length<=maxRequest,413,"Upload request is too large");
        byte[] marker=("\r\n--"+boundary).getBytes(StandardCharsets.US_ASCII);
        byte[] start=("--"+boundary+"\r\n").getBytes(StandardCharsets.US_ASCII);
        ApiException.require(starts(bytes,0,start),400,"Malformed upload");
        int cursor=start.length,parts=0;
        MultipartUpload result=new MultipartUpload();
        while(true) {
            ApiException.require(++parts<=maxPhotos+3,400,"Too many upload fields");
            int headerEnd=index(bytes,"\r\n\r\n".getBytes(StandardCharsets.US_ASCII),cursor);
            ApiException.require(headerEnd>=cursor && headerEnd-cursor<=HEADER_BYTES,400,"Malformed upload headers");
            String headers=new String(bytes,cursor,headerEnd-cursor,StandardCharsets.ISO_8859_1);
            var disposition=Pattern.compile("(?im)^Content-Disposition: form-data; name=\"([A-Za-z]+)\"(; filename=\"[^\"\\r\\n]*\")?\\r?$").matcher(headers);
            ApiException.require(disposition.find(),400,"Invalid upload field");
            String name=disposition.group(1); boolean file=disposition.group(2)!=null;
            int begin=headerEnd+4,end=index(bytes,marker,begin);
            // A boundary inside binary data counts only if followed by a valid delimiter suffix.
            while(end>=0 && !starts(bytes,end+marker.length,new byte[]{13,10}) && !starts(bytes,end+marker.length,new byte[]{45,45})) end=index(bytes,marker,end+1);
            ApiException.require(end>=begin,400,"Incomplete upload");
            int size=end-begin;
            if(file) {
                ApiException.require(name.equals("photos"),400,"Unknown file field");
                ApiException.require(result.photos.size()<maxPhotos,400,"Too many photos");
                ApiException.require(size>0 && size<=photoLimit(),size>photoLimit()?413:400,"Each photo must be nonempty and at most "+photoLimit()/1024/1024+" MB");
                result.photos.add(Arrays.copyOfRange(bytes,begin,end));
            } else {
                ApiException.require(Set.of("conversationId","communityId","title","body").contains(name) && !result.fields.containsKey(name),400,"Unknown or duplicate upload field");
                ApiException.require(size<=FIELD_BYTES,400,"Upload text is too long");
                result.fields.put(name,new String(bytes,begin,size,StandardCharsets.UTF_8));
            }
            cursor=end+marker.length;
            if(starts(bytes,cursor,new byte[]{45,45})) {
                cursor+=2;
                if(starts(bytes,cursor,new byte[]{13,10})) cursor+=2;
                ApiException.require(cursor==bytes.length,400,"Unexpected upload data");
                return result;
            }
            cursor+=2;
        }
    }
    private static boolean starts(byte[] data,int at,byte[] value) {
        if(at<0 || at+value.length>data.length) return false;
        for(int i=0;i<value.length;i++) if(data[at+i]!=value[i]) return false;
        return true;
    }
    private static int index(byte[] data,byte[] value,int from) {
        for(int i=from;i<=data.length-value.length;i++) if(starts(data,i,value)) return i;
        return -1;
    }
}
