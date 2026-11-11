package kr.co.checkmate.server.domain.evaluation.repository;

import kr.co.checkmate.server.domain.evaluation.entity.EvidenceSentence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvidenceSentenceRepository extends JpaRepository<EvidenceSentence, UUID> {

    List<EvidenceSentence> findByEvaluationResultId(UUID evaluationResultId);

    List<EvidenceSentence> findByCategory(String category);
}
