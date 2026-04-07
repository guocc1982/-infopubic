package com.example.hub.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.hub.config.TenantContext;
import com.example.hub.entity.Category;
import com.example.hub.mapper.CategoryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*")
public class CategoryController {

    @Autowired
    private CategoryMapper categoryMapper;

    @GetMapping
    public List<Category> getAllCategories() {
        LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Category::getTenantId, TenantContext.getCurrentTenant())
                .orderByAsc(Category::getDisplayOrder);
        return categoryMapper.selectList(queryWrapper);
    }

    @PostMapping
    public Category createCategory(@RequestBody Category category) {
        category.setTenantId(TenantContext.getCurrentTenant());
        categoryMapper.insert(category);
        return category;
    }

    @PutMapping("/{id}")
    public Category updateCategory(@PathVariable Long id, @RequestBody Category categoryDetails) {
        LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Category::getId, id)
                .eq(Category::getTenantId, TenantContext.getCurrentTenant());
        Category category = Optional.ofNullable(categoryMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        
        category.setName(categoryDetails.getName());
        category.setParentId(categoryDetails.getParentId());
        category.setDescription(categoryDetails.getDescription());
        category.setDisplayOrder(categoryDetails.getDisplayOrder());
        category.setIsPublished(categoryDetails.getIsPublished());
        category.setIcon(categoryDetails.getIcon());
        
        categoryMapper.updateById(category);
        return category;
    }

    @DeleteMapping("/{id}")
    public void deleteCategory(@PathVariable Long id) {
        LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Category::getId, id)
                .eq(Category::getTenantId, TenantContext.getCurrentTenant());
        Category category = Optional.ofNullable(categoryMapper.selectOne(queryWrapper))
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));
        categoryMapper.deleteById(category.getId());
    }
}
