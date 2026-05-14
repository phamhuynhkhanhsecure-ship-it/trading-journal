package com.conarum.tradingjournal.domain.trade.repository;

import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
@RequiredArgsConstructor
public class TradeCustomRepositoryImpl implements TradeCustomRepository {

    private final MongoTemplate mongoTemplate;

    private Query buildQuery(String userEmail, DateRangeFilterDto filter) {
        Query query = new Query();
        query.addCriteria(Criteria.where("userEmail").is(userEmail));
        if (filter != null && (filter.getDateFrom() != null || filter.getDateTo() != null)) {
            Criteria dateCriteria = Criteria.where("date");
            if (filter.getDateFrom() != null && !filter.getDateFrom().isEmpty()) {
                dateCriteria.gte(filter.getDateFrom());
            }
            if (filter.getDateTo() != null && !filter.getDateTo().isEmpty()) {
                dateCriteria.lte(filter.getDateTo());
            }
            query.addCriteria(dateCriteria);
        }
        return query;
    }

    @Override
    public List<Trade> findTradesWithFilter(String userEmail, DateRangeFilterDto filter) {
        Query query = buildQuery(userEmail, filter);
        return mongoTemplate.find(query, Trade.class);
    }

    @Override
    public List<Trade> findTradesByDates(String userEmail, Set<String> dates) {
        Query query = new Query(Criteria.where("date").in(dates).and("userEmail").is(userEmail));
        return mongoTemplate.find(query, Trade.class);
    }

    @Override
    public List<Trade> findTradesByTradeFilter(String userEmail, TradeFilterDto filter) {
        Query query = new Query();
        query.addCriteria(Criteria.where("userEmail").is(userEmail));
        
        if (filter.getYear() != null && filter.getMonth() != null) {
            String monthStr = filter.getMonth() < 10 ? "0" + filter.getMonth() : String.valueOf(filter.getMonth());
            String yearMonth = filter.getYear() + "-" + monthStr;
            query.addCriteria(Criteria.where("date").regex("^" + yearMonth));
        } else {
            if (filter.getDateFrom() != null || filter.getDateTo() != null) {
                Criteria dateCriteria = Criteria.where("date");
                if (filter.getDateFrom() != null && !filter.getDateFrom().isEmpty()) {
                    dateCriteria.gte(filter.getDateFrom());
                }
                if (filter.getDateTo() != null && !filter.getDateTo().isEmpty()) {
                    dateCriteria.lte(filter.getDateTo());
                }
                query.addCriteria(dateCriteria);
            }
        }
        
        if (filter.getInstrument() != null && !filter.getInstrument().isEmpty()) {
            query.addCriteria(Criteria.where("instrument").is(filter.getInstrument()));
        }
        if (filter.getSide() != null && !filter.getSide().isEmpty()) {
            query.addCriteria(Criteria.where("side").is(filter.getSide()));
        }
        if (filter.getTag() != null && !filter.getTag().isEmpty()) {
            query.addCriteria(Criteria.where("tags").in(filter.getTag()));
        }
        if (filter.getPlaybookId() != null && !filter.getPlaybookId().isEmpty()) {
            query.addCriteria(Criteria.where("playbookId").is(filter.getPlaybookId()));
        }
        if (filter.getRating() != null) {
            query.addCriteria(Criteria.where("rating").is(filter.getRating()));
        }
        if (filter.getPnlMin() != null || filter.getPnlMax() != null) {
            Criteria pnlCriteria = Criteria.where("pnl");
            if (filter.getPnlMin() != null) pnlCriteria.gte(filter.getPnlMin());
            if (filter.getPnlMax() != null) pnlCriteria.lte(filter.getPnlMax());
            query.addCriteria(pnlCriteria);
        }
        if (filter.getSearch() != null && !filter.getSearch().isEmpty()) {
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("instrument").regex(filter.getSearch(), "i"),
                Criteria.where("notes").regex(filter.getSearch(), "i")
            ));
        }
        
        query.with(Sort.by(Sort.Direction.DESC, "date"));
        return mongoTemplate.find(query, Trade.class);
    }
}
