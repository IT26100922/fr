package com.friendfinder.model;

import com.friendfinder.interfacepkg.Approvable;

public final class Post implements Approvable {
    private final long id; private final long authorId; private final long communityId;
    private final String title; private final String body; private String status; private Long moderatorId;
    public Post(long authorId, long communityId, String title, String body) { this(0, authorId, communityId, title, body, "PENDING"); }
    public Post(long id, long authorId, long communityId, String title, String body, String status) {
        this(id,authorId,communityId,title,body,status,false);
    }
    public Post(long id,long authorId,long communityId,String title,String body,String status,boolean hasPhotos) {
        if (title == null || (!hasPhotos && title.isBlank()) || title.length() > 160 || body == null || (!hasPhotos && body.isBlank()) || body.length() > 10000) throw new IllegalArgumentException("Add post text or photos; title is limited to 160 and text to 10000 characters");
        if (!java.util.List.of("PENDING","APPROVED","REJECTED").contains(status)) throw new IllegalArgumentException("Invalid post status");
        this.id = id; this.authorId = authorId; this.communityId = communityId; this.title = title.trim(); this.body = body.trim(); this.status = status;
    }
    public long getId() { return id; } public long getAuthorId() { return authorId; } public long getCommunityId() { return communityId; }
    public String getTitle() { return title; } public String getBody() { return body; } public String getStatus() { return status; } public Long getModeratorId() { return moderatorId; }
    @Override public void approve(long moderatorId) { moderate(moderatorId, "APPROVED"); }
    @Override public void reject(long moderatorId) { moderate(moderatorId, "REJECTED"); }
    private void moderate(long moderatorId, String status) {
        if (!this.status.equals("PENDING")) throw new IllegalStateException("Post already moderated");
        if (moderatorId == authorId) throw new IllegalArgumentException("Cannot moderate your own post");
        this.moderatorId = moderatorId; this.status = status;
    }
}
