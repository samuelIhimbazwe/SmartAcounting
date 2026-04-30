package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
public record InstallPluginRequest(@NotBlank String pluginKey, @NotBlank String version) {}
