package com.conarum.tradingjournal.domain.rule.repository;

import com.conarum.tradingjournal.domain.rule.model.Rule;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RuleRepository extends MongoRepository<Rule, String> {
    List<Rule> findByUserEmailOrderBySortOrderAsc(String userEmail);
    List<Rule> findByUserEmailAndIsActiveTrueOrderBySortOrderAsc(String userEmail);
    List<Rule> findByUserEmail(String userEmail);
}
