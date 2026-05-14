package com.conarum.tradingjournal.domain.journal.repository;

import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class JournalEntryCustomRepositoryImpl implements JournalEntryCustomRepository {

    private final MongoTemplate mongoTemplate;

    @Override
    public List<JournalEntry> findJournalsWithFilter(String userEmail, DateRangeFilterDto filter) {
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
        return mongoTemplate.find(query, JournalEntry.class);
    }
}
