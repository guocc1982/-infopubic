package com.example.hub.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.hub.entity.Article;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
}
