# ExpertIQ Copilot - Production Deployment Guide

## Overview

This document describes the production-grade upgrade with LLM-powered semantic search, vector database optimization, and memory-efficient architecture.

## Architecture

### Components

#### 1. **Lightweight Embeddings Engine** (`embeddings_pro.py`)
- **Model**: FastEmbed (ONNX-based) - ~150MB on disk
- **Memory**: ~200-300MB at runtime (vs ~1GB with PyTorch)
- **Features**:
  - Batch processing (configurable batch size)
  - TTL-based result caching (24-hour window)
  - LRU eviction for memory efficiency
  - Cache hit tracking for monitoring

#### 2. **Production Vector Store** (`vector_store_pro.py`)
- **Backend**: ChromaDB with persistent storage
- **Features**:
  - Semantic search with similarity thresholds
  - Query result caching (1-hour TTL, 5000 unique queries)
  - Batch upsert operations
  - Metadata filtering and indexing
  - Performance metrics tracking

#### 3. **LLM-Powered Semantic Search** (`llm_search.py`)
- **LLM Integration**: Groq API (with fallbacks)
- **Search Pipeline**:
  1. Query understanding and expansion
  2. Semantic search via vector DB
  3. Optional LLM re-ranking
  4. Fallback to lightweight search if needed
- **Features**:
  - Resilient retry logic (exponential backoff)
  - Token optimization
  - Graceful degradation when LLM unavailable
  - Structured responses with Pydantic

#### 4. **Monitoring & Observability** (`monitoring.py`)
- **Metrics**:
  - Search latency (Prometheus histograms)
  - Cache hit rates
  - Error tracking and rates
  - LLM request counts
  - Active search operations
- **Health Checks**:
  - `/api/health` - Basic health
  - `/api/metrics/system` - System performance
  - `/api/metrics/search` - Search pipeline metrics
  - `/metrics/prometheus` - Prometheus format

## Performance Characteristics

### Memory Usage
- **Base API**: ~150-200MB
- **Embedding Model**: ~200-300MB
- **ChromaDB Cached**: ~50-100MB
- **Query Cache**: ~50-100MB
- **Total**: ~400-600MB at runtime

### Latency
- **Embedding Generation**: ~10-50ms per text
- **Semantic Search**: ~20-100ms
- **LLM Re-ranking**: ~500-2000ms (optional)
- **Cache Hit**: ~1-5ms

### Throughput
- **Without LLM Ranking**: ~100-200 searches/second
- **With LLM Ranking**: ~50-100 searches/second

## Configuration

### Environment Variables

```bash
# LLM Integration
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
ENABLE_REMOTE_LLM=true

# Vector DB
CHROMA_PERSIST_DIR=./chroma_db
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Caching
QUERY_CACHE_SIZE=10000
QUERY_CACHE_TTL_SECONDS=3600

# Search
SEMANTIC_SEARCH_THRESHOLD=0.3
TOP_K_RESULTS=20

# Performance
EMBEDDING_BATCH_SIZE=128
DB_POOL_SIZE=20
RATE_LIMIT_PER_MINUTE=100
```

### Production Settings

Create `.env.production`:

```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
ENABLE_LLM_RANKING=true
ENABLE_PROMETHEUS_METRICS=true
CORS_ALLOW_CREDENTIALS=true
```

## Deployment

### Docker Deployment

```bash
# Build
docker build -f backend/Dockerfile -t expertiq-api:latest ./backend

# Run
docker run \
  -e GROQ_API_KEY=$GROQ_API_KEY \
  -e CHROMA_PERSIST_DIR=/data/chroma_db \
  -v expertiq-data:/data \
  -p 8000:8000 \
  expertiq-api:latest
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: expertiq-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: expertiq-api
  template:
    metadata:
      labels:
        app: expertiq-api
    spec:
      containers:
      - name: api
        image: expertiq-api:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Monitoring

### Prometheus Setup

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'expertiq'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/api/metrics/prometheus'
```

### Key Metrics to Track

1. **Search Performance**
   ```
   expertiq_search_duration_seconds
   expertiq_cache_hits_total
   expertiq_search_errors_total
   ```

2. **Resource Usage**
   ```
   expertiq_cache_size_bytes
   expertiq_vector_db_size_bytes
   process_resident_memory_bytes
   ```

3. **Availability**
   ```
   up{job="expertiq"}
   expertiq_search_total
   ```

### Alerting

Example alerts:

```yaml
- alert: HighErrorRate
  expr: rate(expertiq_search_errors_total[5m]) > 0.05
  annotations:
    summary: "High search error rate detected"

- alert: HighLatency
  expr: histogram_quantile(0.95, expertiq_search_duration_seconds) > 2
  annotations:
    summary: "P95 search latency above 2 seconds"

- alert: LowCacheHitRate
  expr: expertiq_cache_hits_total / expertiq_search_total < 0.3
  annotations:
    summary: "Cache hit rate below 30%"
```

## API Endpoints

### Search
- **POST** `/api/search` - Semantic search with LLM ranking
- **POST** `/api/search/stream` - Streaming results

### Monitoring
- **GET** `/api/health` - Health check
- **GET** `/api/metrics/system` - System metrics
- **GET** `/api/metrics/search` - Search metrics
- **GET** `/api/metrics/prometheus` - Prometheus format

### Experts
- **GET** `/api/experts` - List experts
- **GET** `/api/experts/{id}` - Get expert profile
- **GET** `/api/experts/by-industry/{industry}` - Filter by industry

## Optimization Tips

### 1. Batch Processing
```python
# Efficient for bulk operations
embeddings = embedding_service.embed_batch(
    texts=large_list_of_texts,
    batch_size=128
)
```

### 2. Caching Strategy
- **Query Cache**: 1-hour TTL for frequently searched queries
- **Embedding Cache**: 24-hour TTL to avoid re-computing
- **Result Cache**: In-memory for hot paths

### 3. LLM Cost Optimization
- Disable LLM ranking for simple queries
- Use streaming for large result sets
- Implement request deduplication

### 4. Memory Management
- Lazy load embedding models
- Use persistent ChromaDB for scalability
- Implement result pagination
- Clear caches during low-traffic periods

## Troubleshooting

### High Memory Usage
1. Reduce `QUERY_CACHE_SIZE`
2. Lower `EMBEDDING_CACHE_SIZE`
3. Check for embedding model leaks

### Slow Searches
1. Enable LLM ranking (improves relevance)
2. Increase `EMBEDDING_BATCH_SIZE`
3. Check ChromaDB index health

### LLM Failures
- Check `GROQ_API_KEY` configuration
- Verify Groq API status
- System falls back to semantic search

## Production Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Configure `GROQ_API_KEY`
- [ ] Set up Prometheus monitoring
- [ ] Configure health checks
- [ ] Enable rate limiting
- [ ] Set resource limits (memory/CPU)
- [ ] Configure log aggregation
- [ ] Set up alerting
- [ ] Test failover scenarios
- [ ] Backup ChromaDB data

## Support

For issues or questions:
1. Check monitoring endpoints
2. Review application logs
3. Consult troubleshooting section
4. Report issues with metrics snapshot
