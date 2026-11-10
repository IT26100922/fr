package com.friendfinder.controller;

import com.sun.net.httpserver.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.SQLException;
import java.util.*;
import java.util.concurrent.Semaphore;
import com.friendfinder.service.*;
import com.friendfinder.util.*;

/** Shares sessions and services with the existing JSON API. */
public final class AttachmentController implements HttpHandler {
    private final AuthService auth;
    private static final Semaphore UPLOADS=new Semaphore(2);
    public AttachmentController(AuthService auth) { this.auth=auth; }
    @Override public void handle(HttpExchange exchange) throws IOException {
        int status=200;Object response;boolean acquired=false;
        headers(exchange);
        try {
            String path=exchange.getRequestURI().getPath(),method=exchange.getRequestMethod();
            var actor=auth.authenticate(ApiController.cookie(exchange,"ff_session"));
            AuthService.member(actor);
            if(path.matches("/api/attachments/[1-9][0-9]*")) {
                ApiController.requireMethod(method,"GET");
                long id;
                try { id=Long.parseLong(path.substring("/api/attachments/".length())); }
                catch(NumberFormatException e) { throw new ApiException(404,"Photo unavailable"); }
                var photo=new AttachmentService().getAttachment(actor,id);
                // Open before sending headers so a missing/unreadable file produces a clean error.
                try(InputStream input=Files.newInputStream(photo.path(),LinkOption.NOFOLLOW_LINKS)) {
                    exchange.getResponseHeaders().set("Content-Type",photo.type());
                    exchange.getResponseHeaders().set("Content-Disposition","inline; filename=photo-"+id+".png");
                    exchange.sendResponseHeaders(200,photo.size());
                    try(OutputStream output=exchange.getResponseBody()) { input.transferTo(output); }
                }
                return;
            }
            boolean message=path.equals("/api/messages/with-photo");
            ApiException.require(message || path.equals("/api/posts/with-photos"),404,"Endpoint not found");
            ApiController.requireMethod(method,"POST");ApiController.checkOrigin(exchange);
            acquired=UPLOADS.tryAcquire();ApiException.require(acquired,429,"Uploads are busy. Please try again shortly.");
            var upload=MultipartUpload.read(exchange.getRequestBody(),exchange.getRequestHeaders().getFirst("Content-Type"),exchange.getRequestHeaders().getFirst("Content-Length"),message?1:4);
            Set<String> allowed=message?Set.of("conversationId","body"):Set.of("communityId","title","body");
            ApiException.require(allowed.containsAll(upload.fields.keySet()),400,"Unexpected upload fields");
            long id=new AttachmentService().submit(actor,message,upload.fields,upload.photos);
            response=Map.of("id",id,"message",message?"Message sent":"Post submitted for review");
        } catch(ApiException e) { status=e.getStatus();response=Map.of("error",e.getMessage()); }
        catch(IllegalArgumentException e) { status=400;response=Map.of("error","Invalid attachment request"); }
        catch(SQLException e) { status=503;response=Map.of("error","Attachment database unavailable. Check the database and migrations."); }
        catch(IOException e) { System.err.println("Attachment storage error: "+e.getMessage());status=503;response=Map.of("error","Photo storage unavailable. Please try again."); }
        catch(RuntimeException e) { status=500;response=Map.of("error","Photo could not be processed"); }
        finally { if(acquired) UPLOADS.release(); }
        byte[] bytes=Json.stringify(response).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");
        exchange.sendResponseHeaders(status,bytes.length);
        try(OutputStream output=exchange.getResponseBody()) { output.write(bytes); }
        exchange.close();
    }
    private static void headers(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Cache-Control","no-store");
        exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");
        exchange.getResponseHeaders().set("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'");
        exchange.getResponseHeaders().set("Cross-Origin-Resource-Policy","same-origin");
    }
}
