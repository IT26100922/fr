package com.friendfinder.model;

/** One private, normalized photo belonging to exactly one message or post. */
public record PhotoAttachment(long id, long ownerId, Long messageId, Long postId,
                              int position, String storedFilename, String mimeType, int byteSize) {
    public String getUrl() { return "/api/attachments/" + id; }
}
