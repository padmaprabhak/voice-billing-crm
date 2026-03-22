package com.billingcrm.service;

import com.billingcrm.exception.BadRequestException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.model.Product;
import com.billingcrm.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Matches a raw product name string to an actual Product entity in the database.
 *
 * Matching strategy (in order):
 *   1. Exact case-insensitive name match
 *   2. Contains match (DB-level LIKE)
 *   3. In-memory Jaro-Winkler fuzzy match across all active products
 *
 * Rejects if the best fuzzy score is below FUZZY_THRESHOLD.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductMatchService {

    private static final double FUZZY_THRESHOLD = 0.72;

    private final ProductRepository         productRepository;
    private final JaroWinklerSimilarity     jaroWinkler = new JaroWinklerSimilarity();

    /**
     * Resolve a raw name to an active Product.
     * Never returns null — throws a meaningful exception when no match is found.
     */
    public Product resolve(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            throw new BadRequestException("Product name must not be blank");
        }

        String name = rawName.trim();

        // 1. Exact match
        List<Product> exact = productRepository.findByNameIgnoreCaseAndStatus(
            name, Product.Status.ACTIVE);
        if (!exact.isEmpty()) {
            log.debug("Exact product match: '{}' → '{}'", name, exact.get(0).getName());
            return exact.get(0);
        }

        // 2. Contains match
        List<Product> contains = productRepository.findByNameContainingIgnoreCaseAndStatus(
            name, Product.Status.ACTIVE);
        if (contains.size() == 1) {
            log.debug("Contains product match: '{}' → '{}'", name, contains.get(0).getName());
            return contains.get(0);
        }
        if (contains.size() > 1) {
            // pick the shortest name (closest match)
            Product closest = contains.stream()
                .min(Comparator.comparingInt(p -> p.getName().length()))
                .orElseThrow();
            log.debug("Contains (multi) product match: '{}' → '{}'", name, closest.getName());
            return closest;
        }

        // 3. Full fuzzy match across all active products
        List<Product> allActive = productRepository.findAllActive();
        if (allActive.isEmpty()) {
            throw new ResourceNotFoundException(
                "No active products exist in the database. Cannot match '" + name + "'.");
        }

        Optional<ScoredProduct> best = allActive.stream()
            .map(p -> new ScoredProduct(p, score(name, p.getName())))
            .max(Comparator.comparingDouble(ScoredProduct::score));

        if (best.isEmpty()) {
            throw new ResourceNotFoundException(
                "Product not found for name: '" + name + "'");
        }

        ScoredProduct winner = best.get();
        log.info("Fuzzy product match: '{}' → '{}' (score={:.4f})",
            name, winner.product().getName(), winner.score());

        if (winner.score() < FUZZY_THRESHOLD) {
            throw new BadRequestException(String.format(
                "No product closely matching '%s' was found in the database. "
                + "Best candidate was '%s' (similarity=%.0f%%). "
                + "Please add the product or clarify the name.",
                name, winner.product().getName(), winner.score() * 100));
        }

        return winner.product();
    }

    private double score(String query, String candidate) {
        return jaroWinkler.apply(
            query.toLowerCase().trim(),
            candidate.toLowerCase().trim()
        );
    }

    private record ScoredProduct(Product product, double score) {}
}