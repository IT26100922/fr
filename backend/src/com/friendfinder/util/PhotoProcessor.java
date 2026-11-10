package com.friendfinder.util;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import javax.imageio.*;
import javax.imageio.stream.MemoryCacheImageInputStream;

/** Bounded raster decoding and re-encoding. Original filenames, EXIF and trailing data are discarded. */
public final class PhotoProcessor {
    public static final int MAX_BYTES=2*1024*1024, MAX_DIMENSION=4096, MAX_PIXELS=16000000;
    private PhotoProcessor() {}
    public record Result(byte[] bytes,int width,int height) {
        public Result { bytes=bytes.clone(); }
        @Override public byte[] bytes() { return bytes.clone(); }
    }
    public static Result process(byte[] source,String contentType) throws IOException {
        ApiException.require(source.length>0 && source.length<=MAX_BYTES,source.length>MAX_BYTES?413:400,"Choose a PNG or JPEG image up to 2 MB");
        String declared=contentType==null?"":contentType.toLowerCase(Locale.ROOT).split(";",2)[0].trim();
        ApiException.require(declared.equals("image/png") || declared.equals("image/jpeg"),415,"Only PNG and JPEG photos are supported");
        try (var input=new MemoryCacheImageInputStream(new ByteArrayInputStream(source))) {
            Iterator<ImageReader> readers=ImageIO.getImageReaders(input);
            ApiException.require(readers.hasNext(),400,"This file is not a valid PNG or JPEG image");
            ImageReader reader=readers.next();
            try {
                reader.setInput(input,true,true);
                String format=reader.getFormatName().toLowerCase(Locale.ROOT);
                ApiException.require((format.equals("png") && declared.equals("image/png")) || ((format.equals("jpeg") || format.equals("jpg")) && declared.equals("image/jpeg")),400,"The image content does not match its file type");
                int width=reader.getWidth(0),height=reader.getHeight(0);
                ApiException.require(width>=64 && height>=64 && width<=MAX_DIMENSION && height<=MAX_DIMENSION && (long)width*height<=MAX_PIXELS,400,"Photo dimensions must be 64–4096 pixels per side and at most 16 million pixels");
                BufferedImage original=reader.read(0);
                double scale=Math.min(1,640.0/Math.max(width,height));
                int w=Math.max(1,(int)Math.round(width*scale)),h=Math.max(1,(int)Math.round(height*scale));
                BufferedImage normalized=new BufferedImage(w,h,BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics=normalized.createGraphics();
                try { graphics.setColor(Color.WHITE);graphics.fillRect(0,0,w,h);graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);graphics.drawImage(original,0,0,w,h,null); }
                finally { graphics.dispose(); }
                var output=new ByteArrayOutputStream();
                if(!ImageIO.write(normalized,"png",output))throw new IOException("PNG encoder unavailable");
                ApiException.require(output.size()<=MAX_BYTES,400,"The processed image is too large");
                return new Result(output.toByteArray(),w,h);
            } finally { reader.dispose(); }
        } catch (IOException e) { throw new ApiException(400,"This image is damaged or unsupported"); }
    }
}
