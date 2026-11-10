package com.friendfinder;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import javax.imageio.ImageIO;
import com.friendfinder.model.ProfilePhoto;
import com.friendfinder.util.*;

/** JDK-only image validation tests, separate from the original 286 domain checks. */
public final class PhotoTest {
    private static int checks;
    private static void check(boolean result,String name) { checks++;if(!result)throw new AssertionError(name); }
    private static byte[] image(int w,int h,String format) throws IOException {
        var image=new BufferedImage(w,h,BufferedImage.TYPE_INT_RGB);var out=new ByteArrayOutputStream();ImageIO.write(image,format,out);return out.toByteArray();
    }
    private static void rejects(byte[] data,String type,int status) throws Exception {
        try { PhotoProcessor.process(data,type);throw new AssertionError("Photo must be rejected"); }
        catch(ApiException e) { check(e.getStatus()==status,"Expected HTTP "+status); }
    }
    public static void main(String[] args) throws Exception {
        byte[] png=image(96,80,"png"),jpeg=image(100,90,"jpeg");
        var p=PhotoProcessor.process(png,"image/png");check(p.width()==96&&p.height()==80,"PNG dimensions");
        check(ImageIO.read(new ByteArrayInputStream(p.bytes()))!=null,"Normalized PNG decodes");
        var j=PhotoProcessor.process(jpeg,"image/jpeg");check(j.width()==100&&j.height()==90,"JPEG decoded and normalized");
        var scaled=PhotoProcessor.process(image(1280,960,"png"),"image/png");check(scaled.width()==640&&scaled.height()==480,"Large photo is bounded");
        byte[] copy=p.bytes();copy[0]=0;check(p.bytes()[0]!=(byte)0,"Normalized bytes are defensive copies");
        rejects(new byte[0],"image/png",400);
        rejects(new byte[PhotoProcessor.MAX_BYTES+1],"image/png",413);
        rejects(png,"image/svg+xml",415);rejects("<script>oops</script>".getBytes(),"image/png",400);
        rejects(png,"image/jpeg",400);rejects(image(32,80,"png"),"image/png",400);
        rejects(image(4097,64,"png"),"image/png",400);rejects(java.util.Arrays.copyOf(png,20),"image/png",400);
        var metadata=new ProfilePhoto(4,UUID.randomUUID()+".png",96,80,p.bytes().length);
        check(metadata.getUrl().startsWith("/api/photos?userId=4&v="),"Photo URL uses owned identity");
        try {new ProfilePhoto(4,"../../secret.png",96,80,100);throw new AssertionError("Path must fail");}
        catch(IllegalArgumentException expected){check(true,"Path traversal metadata rejected");}
        Files.createDirectories(Path.of("test-results"));Files.write(Path.of("test-results/photo-valid.png"),png);Files.write(Path.of("test-results/photo-valid.jpg"),jpeg);
        System.out.println("PASS: "+checks+" photo processing checks");
    }
}
