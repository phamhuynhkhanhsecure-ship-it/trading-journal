package com.conarum.tradingjournal.domain.trade.repository;

import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TradeOutboxEventRepository extends MongoRepository<TradeOutboxEvent, String> {
    List<TradeOutboxEvent> findByStatusOrderByCreatedAtAsc(String status);
}
