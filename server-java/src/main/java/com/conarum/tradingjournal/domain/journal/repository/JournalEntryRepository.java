package com.conarum.tradingjournal.domain.journal.repository;

import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JournalEntryRepository extends MongoRepository<JournalEntry, String>, JournalEntryCustomRepository {
    List<JournalEntry> findByUserEmailOrderByDateDesc(String userEmail);
    Optional<JournalEntry> findByDateAndUserEmail(String date, String userEmail);
}
