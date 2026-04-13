package com.example.hub.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

@Data
@TableName("system_settings")
public class SystemSettings implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    private String siteName;
    private String siteDescription;
    private Boolean allowRegistration;
    private String defaultRole;
    private Boolean enableComments;
    private Boolean requireCommentApproval;
    private Boolean emailNotifications;
    private Boolean pushNotifications;
    private String theme;
    private String primaryColor;
    private String language;
    private String timezone;

    private String tenantId = "default";
}
