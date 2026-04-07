package com.example.hub.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("articles")
public class Article implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String subtitle;

    private Long categoryId;

    private String summary;

    private String content;

    private String thumbnailUrl;

    private String status = "draft"; // draft, pending, published, archived

    private String publishDate;

    private Integer viewCount = 0;

    private Integer readingTime = 5;

    private String author;
    
    private Integer isPinned = 0;

    private Integer allowAnonymous = 1;

    private Integer allowAllRegistered = 0;

    private String allowedRoles;

    private String allowedUsers;

    private String tenantId = "default";
}
