package com.friendfinder.util;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.CRC32;
import javax.imageio.*;
import javax.imageio.stream.MemoryCacheImageInputStream;

/** Signature + container checks + actual decoding. Only fresh PNG pixels reach storage. */
public final class AttachmentPhotoProcessor {
    public static final int MAX_STORED_BYTES=8*1024*1024;
    private AttachmentPhotoProcessor() {}
    public static byte[] validatePhoto(byte[] source) throws IOException {
        ApiException.require(source.length>0 && source.length<=MultipartUpload.photoLimit(),source.length>MultipartUpload.photoLimit()?413:400,"Photo is empty or too large");
        String expected=signature(source);
        validateStructure(source,expected);
        try(var input=new MemoryCacheImageInputStream(new ByteArrayInputStream(source))) {
            var readers=ImageIO.getImageReaders(input);
            ApiException.require(readers.hasNext(),415,expected.equals("webp")?"WebP decoder unavailable; install backend photo dependencies":"Unsupported photo");
            ImageReader reader=readers.next();
            try {
                reader.setInput(input,false,true);
                ApiException.require(reader.getFormatName().equalsIgnoreCase(expected),400,"Invalid photo format");
                int width=reader.getWidth(0),height=reader.getHeight(0);
                ApiException.require(width>0 && height>0 && width<=4096 && height<=4096 && (long)width*height<=16000000,400,"Photos must be at most 4096 pixels per side and 16 million pixels");
                boolean[] warning={false};
                reader.addIIOReadWarningListener((ignored,text)->warning[0]=true);
                BufferedImage decoded=reader.read(0);
                ApiException.require(decoded!=null && !warning[0],400,"Malformed or incomplete image");
                double scale=Math.min(1,1600.0/Math.max(width,height));
                int w=Math.max(1,(int)Math.round(width*scale)),h=Math.max(1,(int)Math.round(height*scale));
                BufferedImage normalized=new BufferedImage(w,h,BufferedImage.TYPE_INT_ARGB);
                Graphics2D graphics=normalized.createGraphics();
                try { graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BILINEAR);graphics.drawImage(decoded,0,0,w,h,null); }
                finally { graphics.dispose();decoded.flush(); }
                // Bound encoder output as well as input and decoded pixel count.
                var output=new ByteArrayOutputStream();
                OutputStream bounded=new FilterOutputStream(output) {
                    @Override public void write(int b) throws IOException { if(output.size()>=MAX_STORED_BYTES) throw new IOException("Image output too large");out.write(b); }
                    @Override public void write(byte[] b,int off,int len) throws IOException { if((long)output.size()+len>MAX_STORED_BYTES) throw new IOException("Image output too large");out.write(b,off,len); }
                };
                try { if(!ImageIO.write(normalized,"png",bounded)) throw new IOException("PNG encoder missing"); }
                finally { normalized.flush(); }
                return output.toByteArray();
            } finally { reader.dispose(); }
        } catch(IOException|IndexOutOfBoundsException e) { throw new ApiException(400,"Malformed or unsupported image"); }
    }
    private static String signature(byte[] b) {
        if(b.length>=8 && Arrays.equals(Arrays.copyOf(b,8),new byte[]{(byte)137,80,78,71,13,10,26,10})) return "png";
        if(b.length>=4 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255) return "JPEG";
        if(b.length>=20 && ascii(b,0).equals("RIFF") && ascii(b,8).equals("WEBP")) return "webp";
        throw new ApiException(415,"Choose a JPEG, PNG or WebP photo");
    }
    private static String ascii(byte[] b,int at) { return new String(b,at,4,StandardCharsets.US_ASCII); }
    private static long integer(byte[] b,int at,ByteOrder order) { return Integer.toUnsignedLong(ByteBuffer.wrap(b,at,4).order(order).getInt()); }
    private static void valid(boolean condition) { ApiException.require(condition,400,"Malformed or incomplete image"); }
    private static void validateStructure(byte[] b,String format) {
        if(format.equals("JPEG")) {
            valid((b[b.length-2]&255)==255 && (b[b.length-1]&255)==217);
        } else if(format.equals("png")) {
            int at=8;boolean pixels=false,ended=false;
            while(at<b.length) {
                valid((long)at+12<=b.length);
                long size=integer(b,at,ByteOrder.BIG_ENDIAN);
                valid(size<=b.length-at-12);
                String type=ascii(b,at+4);
                if(at==8) valid(type.equals("IHDR") && size==13);
                CRC32 crc=new CRC32();crc.update(b,at+4,(int)size+4);
                valid(crc.getValue()==integer(b,at+8+(int)size,ByteOrder.BIG_ENDIAN));
                if(type.equals("IDAT")) pixels=true;
                at+=(int)size+12;
                if(type.equals("IEND")) { valid(size==0 && at==b.length);ended=true;break; }
                valid(!type.equals("acTL")); // Still photos only.
            }
            valid(pixels && ended);
        } else {
            valid(integer(b,4,ByteOrder.LITTLE_ENDIAN)==b.length-8);
            int at=12;boolean pixels=false;
            while(at<b.length) {
                valid((long)at+8<=b.length);
                String type=ascii(b,at);
                long size=integer(b,at+4,ByteOrder.LITTLE_ENDIAN);
                valid(size>0 && size+(size&1)<=b.length-at-8);
                valid(!type.equals("ANIM") && !type.equals("ANMF"));
                if(type.equals("VP8 ") || type.equals("VP8L")) { valid(!pixels);pixels=true; }
                at+=8+(int)size+(int)(size&1);
            }
            valid(pixels && at==b.length);
        }
    }
}
