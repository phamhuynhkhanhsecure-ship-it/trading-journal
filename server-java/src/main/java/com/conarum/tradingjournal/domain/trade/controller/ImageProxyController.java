package com.conarum.tradingjournal.domain.trade.controller;

import com.conarum.tradingjournal.domain.trade.service.GoogleDriveService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageProxyController {

    private final GoogleDriveService googleDriveService;

    @GetMapping("/{driveFileId}")
    public ResponseEntity<InputStreamResource> proxyImage(@PathVariable String driveFileId) {
        try {
            GoogleDriveService.FileDownload download = googleDriveService.getFileStream(driveFileId);
            InputStreamResource resource = new InputStreamResource(download.stream);

            String mimeType = download.contentType != null ? download.contentType : "application/octet-stream";
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .header("Cross-Origin-Resource-Policy", "cross-origin")
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
