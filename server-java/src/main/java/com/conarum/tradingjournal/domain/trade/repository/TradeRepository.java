package com.conarum.tradingjournal.domain.trade.repository;

import com.conarum.tradingjournal.domain.trade.model.Trade;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TradeRepository extends MongoRepository<Trade, String>, TradeCustomRepository {
    List<Trade> findByUserEmailOrderByDateDesc(String userEmail);
    List<Trade> findByUserEmailAndDateStartingWithOrderByDateDesc(String userEmail, String yearMonth);
    Optional<Trade> findByIdAndUserEmail(String id, String userEmail);
    List<Trade> findByPlaybookIdAndUserEmail(String playbookId, String userEmail);
}
