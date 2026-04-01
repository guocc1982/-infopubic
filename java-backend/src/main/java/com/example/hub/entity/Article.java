package com.example.hub.entity;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "articles")
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String subtitle;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    private String status = "draft"; // draft, pending, published, archived

    @Column(name = "publish_date")
    private String publishDate;

    @Column(name = "view_count")
    private Integer viewCount = 0;

    @Column(name = "reading_time")
    private Integer readingTime = 5;

    private String author;
    
    @Column(name = "is_pinned")
    private Integer isPinned = 0;

    @Column(name = "allow_anonymous")
    private Integer allowAnonymous = 1;

    @Column(name = "allow_all_registered")
    private Integer allowAllRegistered = 0;

    @Column(name = "allowed_roles")
    private String allowedRoles;

    @Column(name = "allowed_users")
    private String allowedUsers;

    @Column(name = "tenant_id")
    private String tenantId = "default";
}
