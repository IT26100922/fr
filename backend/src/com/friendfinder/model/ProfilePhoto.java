package com.friendfinder.model;

/** Validated metadata for one normalized, member-owned image. No client path is stored. */
public final class ProfilePhoto {
    private final long userId;
    private final String fileKey;
    private final int width, height, byteSize;
    public ProfilePhoto(long userId,String fileKey,int width,int height,int byteSize) {
        if (userId<1 || fileKey==null || !fileKey.matches("[a-f0-9-]{36}\\.png") || width<1 || height<1 || width>640 || height>640 || byteSize<1 || byteSize>2097152)
            throw new IllegalArgumentException("Invalid profile photo metadata");
        this.userId=userId; this.fileKey=fileKey; this.width=width; this.height=height; this.byteSize=byteSize;
    }
    public long getUserId() { return userId; }
    public String getFileKey() { return fileKey; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public int getByteSize() { return byteSize; }
    public String getVersion() { return fileKey.substring(0,36); }
    public String getUrl() { return "/api/photos?userId="+userId+"&v="+getVersion(); }
}
