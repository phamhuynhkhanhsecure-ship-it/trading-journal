package com.conarum.tradingjournal.domain.trade.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.InputStreamContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Collections;

@Service
public class GoogleDriveService {

    @Value("${google.drive.client-id}")
    private String clientId;

    @Value("${google.drive.client-secret}")
    private String clientSecret;

    @Value("${google.drive.refresh-token}")
    private String refreshToken;

    @Value("${google.drive.folder-id}")
    private String folderId;

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private Drive getDriveService() throws Exception {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        
        Credential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientId, clientSecret)
                .build()
                .setRefreshToken(refreshToken);

        return new Drive.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName("Trading Journal")
                .build();
    }

    public String uploadFile(MultipartFile multipartFile, String uniqueName) throws Exception {
        Drive driveService = getDriveService();

        File fileMetadata = new File();
        fileMetadata.setName(uniqueName);
        fileMetadata.setParents(Collections.singletonList(folderId));

        InputStreamContent mediaContent = new InputStreamContent(
                multipartFile.getContentType(),
                new ByteArrayInputStream(multipartFile.getBytes())
        );

        File file = driveService.files().create(fileMetadata, mediaContent)
                .setFields("id")
                .execute();

        return file.getId();
    }

    public void deleteFile(String fileId) {
        try {
            Drive driveService = getDriveService();
            driveService.files().delete(fileId).execute();
        } catch (Exception e) {
            System.err.println("Failed to delete from Google Drive: " + e.getMessage());
        }
    }

    public static class FileDownload {
        public InputStream stream;
        public String contentType;
        public FileDownload(InputStream stream, String contentType) {
            this.stream = stream;
            this.contentType = contentType;
        }
    }

    public FileDownload getFileStream(String fileId) throws Exception {
        Drive driveService = getDriveService();
        com.google.api.client.http.HttpResponse response = driveService.files().get(fileId).executeMedia();
        return new FileDownload(response.getContent(), response.getContentType());
    }
}
