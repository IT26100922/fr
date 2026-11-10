package com.friendfinder.controller;

import com.sun.net.httpserver.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.*;
import com.friendfinder.service.*;
import com.friendfinder.util.*;

/** PNG/JPEG binary upload endpoint; session service is shared with the JSON controller. */
public final class PhotoController implements HttpHandler {
    private final AuthService auth;
    public PhotoController(AuthService auth) { this.auth=auth; }
    @Override public void handle(HttpExchange exchange) throws IOException {
        int status=200;Object response;
        try {
            String path=exchange.getRequestURI().getPath(),method=exchange.getRequestMethod();
            ApiException.require(path.equals("/api/photos") || path.equals("/api/photos/remove"),404,"Endpoint not found");
            ApiException.require(method.equals("GET") || method.equals("POST"),405,"Use GET or POST");
            var actor=auth.authenticate(ApiController.cookie(exchange,"ff_session"));AuthService.member(actor);
            var service=new PhotoService();
            Map<String,Object> query=ApiController.query(exchange.getRequestURI().getRawQuery());
            if(method.equals("GET")) {
                ApiException.require(path.equals("/api/photos"),405,"Use POST to remove a photo");
                byte[] image=service.read(actor,Input.id(query,"userId"),query.containsKey("v")?Input.text(query,"v",36,36):null);
                exchange.getResponseHeaders().set("Content-Type","image/png");
                exchange.getResponseHeaders().set("Content-Disposition","inline; filename=profile.png");
                headers(exchange);exchange.sendResponseHeaders(200,image.length);try(OutputStream out=exchange.getResponseBody()){out.write(image);}return;
            }
            ApiController.checkOrigin(exchange);
            if(query.containsKey("userId"))ApiException.require(Input.id(query,"userId")==actor.getId(),403,"You can change only your own photo");
            if(path.equals("/api/photos/remove")) {
                var data=ApiController.body(exchange);
                if(data.containsKey("userId"))ApiException.require(Input.id(data,"userId")==actor.getId(),403,"You can change only your own photo");
                service.remove(actor);response=Map.of("message","Profile photo removed");
            } else {
                var photo=service.upload(actor,exchange.getRequestBody(),exchange.getRequestHeaders().getFirst("Content-Type"));
                response=Map.of("message","Profile photo saved","photo_url",photo.getUrl(),"width",photo.getWidth(),"height",photo.getHeight());
            }
        } catch(ApiException e) { status=e.getStatus();response=Map.of("error",e.getMessage()); }
        catch(IllegalArgumentException e) { status=400;response=Map.of("error","Invalid photo request"); }
        catch(SQLException e) { status=503;response=Map.of("error","Photo storage is unavailable. Check the database configuration and migrations."); }
        catch(IOException e) { status=503;response=Map.of("error","Photo storage is unavailable. Please try again."); }
        catch(RuntimeException e) { status=500;response=Map.of("error","The photo could not be processed"); }
        byte[] bytes=Json.stringify(response).getBytes(StandardCharsets.UTF_8);headers(exchange);
        exchange.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");exchange.sendResponseHeaders(status,bytes.length);
        try(OutputStream out=exchange.getResponseBody()){out.write(bytes);}
    }
    private static void headers(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Cache-Control","no-store");exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");
        exchange.getResponseHeaders().set("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'");
    }
}
