package com.conarum.tradingjournal.domain.playbook.repository;

import com.conarum.tradingjournal.domain.playbook.model.Playbook;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlaybookRepository extends MongoRepository<Playbook, String> {
    List<Playbook> findByUserEmailOrderBySortOrderAsc(String userEmail);
    List<Playbook> findByUserEmailAndIsActiveTrueOrderBySortOrderAsc(String userEmail);
}
