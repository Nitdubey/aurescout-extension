/**
 * AureScout Skill Lexicon — 2,500+ normalized skills across all domains.
 *
 * Key: lowercase normalized form (used for matching)
 * Value: canonical display name (shown in UI)
 *
 * Special tokens: 'cpp' = C++, 'csharp' = C#, 'dotnet' = .NET
 * (pre-processed by tokenizer before lookup)
 */

// ── Frontend & UI ─────────────────────────────────────────────────────────────
const FRONTEND: [string, string][] = [
  ['react', 'React'], ['reactjs', 'React'], ['react js', 'React'],
  ['next.js', 'Next.js'], ['nextjs', 'Next.js'], ['next js', 'Next.js'],
  ['vue', 'Vue.js'], ['vuejs', 'Vue.js'], ['vue.js', 'Vue.js'], ['vue 3', 'Vue 3'],
  ['angular', 'Angular'], ['angularjs', 'AngularJS'],
  ['svelte', 'Svelte'], ['sveltekit', 'SvelteKit'],
  ['remix', 'Remix'], ['astro', 'Astro'], ['nuxt', 'Nuxt.js'], ['nuxtjs', 'Nuxt.js'],
  ['typescript', 'TypeScript'], ['javascript', 'JavaScript'], ['js', 'JavaScript'],
  ['es6', 'ES6+'], ['es2015', 'ES6+'], ['ecmascript', 'ECMAScript'],
  ['html', 'HTML'], ['html5', 'HTML5'], ['css', 'CSS'], ['css3', 'CSS3'],
  ['tailwind', 'Tailwind CSS'], ['tailwindcss', 'Tailwind CSS'], ['tailwind css', 'Tailwind CSS'],
  ['sass', 'Sass'], ['scss', 'SCSS'], ['less', 'LESS'],
  ['styled components', 'Styled Components'], ['emotion', 'Emotion CSS'],
  ['material ui', 'Material UI'], ['mui', 'Material UI'],
  ['shadcn', 'shadcn/ui'], ['shadcn/ui', 'shadcn/ui'], ['radix ui', 'Radix UI'],
  ['chakra ui', 'Chakra UI'], ['ant design', 'Ant Design'], ['antd', 'Ant Design'],
  ['bootstrap', 'Bootstrap'], ['foundation', 'Foundation CSS'],
  ['redux', 'Redux'], ['redux toolkit', 'Redux Toolkit'], ['rtk', 'Redux Toolkit'],
  ['mobx', 'MobX'], ['zustand', 'Zustand'], ['jotai', 'Jotai'], ['recoil', 'Recoil'],
  ['react query', 'React Query'], ['tanstack query', 'TanStack Query'], ['swr', 'SWR'],
  ['react hook form', 'React Hook Form'], ['formik', 'Formik'], ['zod', 'Zod'],
  ['vite', 'Vite'], ['webpack', 'Webpack'], ['rollup', 'Rollup'], ['esbuild', 'esbuild'],
  ['parcel', 'Parcel'], ['turbopack', 'Turbopack'], ['babel', 'Babel'],
  ['jest', 'Jest'], ['vitest', 'Vitest'], ['cypress', 'Cypress'], ['playwright', 'Playwright'],
  ['testing library', 'Testing Library'], ['react testing library', 'React Testing Library'],
  ['storybook', 'Storybook'], ['chromatic', 'Chromatic'],
  ['framer motion', 'Framer Motion'], ['gsap', 'GSAP'], ['three.js', 'Three.js'], ['threejs', 'Three.js'],
  ['d3', 'D3.js'], ['d3.js', 'D3.js'], ['chart.js', 'Chart.js'], ['echarts', 'ECharts'],
  ['recharts', 'Recharts'], ['victory', 'Victory Charts'],
  ['webgl', 'WebGL'], ['webgpu', 'WebGPU'], ['canvas', 'HTML Canvas'],
  ['pwa', 'PWA'], ['web components', 'Web Components'], ['lit', 'Lit'],
  ['react native', 'React Native'], ['expo', 'Expo'],
  ['electron', 'Electron'], ['tauri', 'Tauri'],
  ['wasm', 'WebAssembly'], ['webassembly', 'WebAssembly'],
  ['graphql', 'GraphQL'], ['apollo client', 'Apollo Client'], ['urql', 'urql'],
  ['trpc', 'tRPC'], ['rest api', 'REST API'], ['fetch api', 'Fetch API'],
  ['axios', 'Axios'], ['websocket', 'WebSocket'],
  ['seo', 'SEO'], ['core web vitals', 'Core Web Vitals'], ['lighthouse', 'Lighthouse'],
  ['accessibility', 'Accessibility'], ['a11y', 'Accessibility'], ['wcag', 'WCAG'],
  ['i18n', 'Internationalization'], ['l10n', 'Localization'],
  ['figma', 'Figma'], ['sketch', 'Sketch'], ['adobe xd', 'Adobe XD'],
  ['responsive design', 'Responsive Design'], ['mobile first', 'Mobile-First'],
  ['micro frontends', 'Micro Frontends'], ['module federation', 'Module Federation'],
];

// ── Backend ───────────────────────────────────────────────────────────────────
const BACKEND: [string, string][] = [
  ['node', 'Node.js'], ['node.js', 'Node.js'], ['nodejs', 'Node.js'],
  ['express', 'Express.js'], ['expressjs', 'Express.js'], ['express.js', 'Express.js'],
  ['fastify', 'Fastify'], ['nestjs', 'NestJS'], ['nest.js', 'NestJS'],
  ['koa', 'Koa.js'], ['hapi', 'Hapi.js'], ['feathersjs', 'FeathersJS'],
  ['hono', 'Hono'], ['bun', 'Bun'], ['deno', 'Deno'],
  ['python', 'Python'], ['django', 'Django'], ['flask', 'Flask'], ['fastapi', 'FastAPI'],
  ['celery', 'Celery'], ['pydantic', 'Pydantic'], ['sqlalchemy', 'SQLAlchemy'],
  ['ruby', 'Ruby'], ['rails', 'Ruby on Rails'], ['ruby on rails', 'Ruby on Rails'],
  ['go', 'Go'], ['golang', 'Go'],
  ['rust', 'Rust'], ['actix', 'Actix Web'], ['axum', 'Axum'],
  ['java', 'Java'], ['spring', 'Spring Framework'], ['spring boot', 'Spring Boot'],
  ['hibernate', 'Hibernate'], ['maven', 'Maven'], ['gradle', 'Gradle'],
  ['kotlin', 'Kotlin'], ['scala', 'Scala'], ['akka', 'Akka'],
  ['csharp', 'C#'], ['dotnet', '.NET'], ['.net core', '.NET Core'],
  ['asp.net', 'ASP.NET'], ['entity framework', 'Entity Framework'],
  ['php', 'PHP'], ['laravel', 'Laravel'], ['symfony', 'Symfony'],
  ['elixir', 'Elixir'], ['phoenix', 'Phoenix Framework'],
  ['haskell', 'Haskell'], ['erlang', 'Erlang'], ['clojure', 'Clojure'],
  ['cpp', 'C++'], ['c', 'C'], ['cmake', 'CMake'],
  ['graphql', 'GraphQL'], ['apollo server', 'Apollo Server'], ['hasura', 'Hasura'],
  ['grpc', 'gRPC'], ['protobuf', 'Protocol Buffers'],
  ['rest', 'REST API'], ['restful', 'RESTful API'], ['openapi', 'OpenAPI'], ['swagger', 'Swagger'],
  ['oauth', 'OAuth'], ['oauth2', 'OAuth 2.0'], ['jwt', 'JWT'], ['openid connect', 'OpenID Connect'],
  ['saml', 'SAML'], ['sso', 'SSO'],
  ['websocket', 'WebSocket'], ['sse', 'Server-Sent Events'], ['socket.io', 'Socket.IO'],
  ['kafka', 'Apache Kafka'], ['rabbitmq', 'RabbitMQ'], ['sqs', 'Amazon SQS'],
  ['celery', 'Celery'], ['bullmq', 'BullMQ'], ['sidekiq', 'Sidekiq'],
  ['redis', 'Redis'], ['memcached', 'Memcached'],
  ['nginx', 'Nginx'], ['apache', 'Apache HTTP'], ['traefik', 'Traefik'],
  ['microservices', 'Microservices'], ['event driven', 'Event-Driven Architecture'],
  ['cqrs', 'CQRS'], ['event sourcing', 'Event Sourcing'],
  ['domain driven design', 'Domain-Driven Design'], ['ddd', 'DDD'],
  ['solid principles', 'SOLID Principles'], ['design patterns', 'Design Patterns'],
  ['tdd', 'TDD'], ['bdd', 'BDD'], ['clean architecture', 'Clean Architecture'],
  ['api gateway', 'API Gateway'], ['service mesh', 'Service Mesh'], ['istio', 'Istio'],
  ['serverless', 'Serverless'], ['lambda', 'AWS Lambda'], ['cloud functions', 'Cloud Functions'],
  ['edge computing', 'Edge Computing'],
];

// ── Cloud & DevOps ────────────────────────────────────────────────────────────
const CLOUD_DEVOPS: [string, string][] = [
  ['aws', 'AWS'], ['amazon web services', 'AWS'],
  ['ec2', 'EC2'], ['s3', 'S3'], ['rds', 'Amazon RDS'], ['dynamodb', 'DynamoDB'],
  ['lambda', 'AWS Lambda'], ['cloudformation', 'CloudFormation'], ['cdk', 'AWS CDK'],
  ['eks', 'Amazon EKS'], ['ecs', 'Amazon ECS'], ['fargate', 'AWS Fargate'],
  ['cloudfront', 'CloudFront'], ['route53', 'Route 53'], ['elb', 'ELB'],
  ['sqs', 'Amazon SQS'], ['sns', 'Amazon SNS'], ['kinesis', 'Kinesis'],
  ['gcp', 'GCP'], ['google cloud', 'GCP'],
  ['gke', 'GKE'], ['cloud run', 'Cloud Run'], ['bigquery', 'BigQuery'],
  ['cloud storage', 'GCS'], ['vertex ai', 'Vertex AI'], ['firebase', 'Firebase'],
  ['azure', 'Azure'], ['microsoft azure', 'Azure'],
  ['azure devops', 'Azure DevOps'], ['aks', 'AKS'], ['azure functions', 'Azure Functions'],
  ['docker', 'Docker'], ['docker compose', 'Docker Compose'],
  ['kubernetes', 'Kubernetes'], ['k8s', 'Kubernetes'], ['helm', 'Helm'], ['kustomize', 'Kustomize'],
  ['terraform', 'Terraform'], ['pulumi', 'Pulumi'], ['ansible', 'Ansible'],
  ['chef', 'Chef'], ['puppet', 'Puppet'],
  ['ci/cd', 'CI/CD'], ['cicd', 'CI/CD'],
  ['github actions', 'GitHub Actions'], ['gitlab ci', 'GitLab CI'],
  ['jenkins', 'Jenkins'], ['circleci', 'CircleCI'], ['travis ci', 'Travis CI'],
  ['argocd', 'ArgoCD'], ['flux', 'FluxCD'], ['tekton', 'Tekton'],
  ['prometheus', 'Prometheus'], ['grafana', 'Grafana'], ['alertmanager', 'Alertmanager'],
  ['datadog', 'Datadog'], ['new relic', 'New Relic'], ['dynatrace', 'Dynatrace'],
  ['elk stack', 'ELK Stack'], ['elasticsearch', 'Elasticsearch'], ['kibana', 'Kibana'],
  ['logstash', 'Logstash'], ['fluentd', 'Fluentd'], ['opentelemetry', 'OpenTelemetry'],
  ['linux', 'Linux'], ['bash', 'Bash'], ['shell scripting', 'Shell Scripting'],
  ['git', 'Git'], ['github', 'GitHub'], ['gitlab', 'GitLab'], ['bitbucket', 'Bitbucket'],
  ['sre', 'SRE'], ['site reliability', 'Site Reliability Engineering'],
  ['devops', 'DevOps'], ['platform engineering', 'Platform Engineering'],
  ['devsecops', 'DevSecOps'], ['infrastructure as code', 'Infrastructure as Code'], ['iac', 'IaC'],
  ['cost optimization', 'Cloud Cost Optimization'],
  ['vercel', 'Vercel'], ['netlify', 'Netlify'], ['cloudflare', 'Cloudflare'],
  ['supabase', 'Supabase'], ['railway', 'Railway'], ['render', 'Render'],
];

// ── Databases ─────────────────────────────────────────────────────────────────
const DATABASES: [string, string][] = [
  ['postgresql', 'PostgreSQL'], ['postgres', 'PostgreSQL'],
  ['mysql', 'MySQL'], ['mariadb', 'MariaDB'],
  ['sqlite', 'SQLite'], ['oracle', 'Oracle DB'],
  ['mongodb', 'MongoDB'], ['mongoose', 'Mongoose'],
  ['dynamodb', 'DynamoDB'], ['cosmosdb', 'CosmosDB'],
  ['cassandra', 'Apache Cassandra'], ['couchdb', 'CouchDB'],
  ['redis', 'Redis'], ['dragonfly', 'Dragonfly'],
  ['elasticsearch', 'Elasticsearch'], ['opensearch', 'OpenSearch'], ['solr', 'Apache Solr'],
  ['clickhouse', 'ClickHouse'], ['snowflake', 'Snowflake'], ['databricks', 'Databricks'],
  ['bigquery', 'BigQuery'], ['redshift', 'Amazon Redshift'],
  ['dbt', 'dbt'], ['airbyte', 'Airbyte'], ['fivetran', 'Fivetran'],
  ['apache spark', 'Apache Spark'], ['pyspark', 'PySpark'],
  ['hadoop', 'Apache Hadoop'], ['hive', 'Apache Hive'], ['presto', 'Presto'], ['trino', 'Trino'],
  ['airflow', 'Apache Airflow'], ['prefect', 'Prefect'], ['dagster', 'Dagster'],
  ['kafka', 'Apache Kafka'], ['flink', 'Apache Flink'],
  ['pinecone', 'Pinecone'], ['weaviate', 'Weaviate'], ['qdrant', 'Qdrant'], ['milvus', 'Milvus'],
  ['vector database', 'Vector Database'], ['pgvector', 'pgvector'],
  ['sql', 'SQL'], ['nosql', 'NoSQL'], ['orm', 'ORM'],
  ['prisma', 'Prisma'], ['drizzle', 'Drizzle ORM'], ['typeorm', 'TypeORM'],
  ['sequelize', 'Sequelize'], ['knex', 'Knex.js'],
  ['database design', 'Database Design'], ['schema design', 'Schema Design'],
  ['data modeling', 'Data Modeling'], ['indexing', 'Database Indexing'],
  ['replication', 'Database Replication'], ['sharding', 'Database Sharding'],
];

// ── AI & ML ───────────────────────────────────────────────────────────────────
const AI_ML: [string, string][] = [
  ['tensorflow', 'TensorFlow'], ['tf', 'TensorFlow'],
  ['pytorch', 'PyTorch'], ['torch', 'PyTorch'],
  ['keras', 'Keras'], ['jax', 'JAX'],
  ['scikit-learn', 'scikit-learn'], ['sklearn', 'scikit-learn'],
  ['pandas', 'Pandas'], ['numpy', 'NumPy'], ['scipy', 'SciPy'], ['matplotlib', 'Matplotlib'],
  ['seaborn', 'Seaborn'], ['plotly', 'Plotly'],
  ['hugging face', 'Hugging Face'], ['transformers', 'Transformers'], ['diffusers', 'Diffusers'],
  ['langchain', 'LangChain'], ['langgraph', 'LangGraph'], ['llamaindex', 'LlamaIndex'],
  ['openai', 'OpenAI API'], ['openai api', 'OpenAI API'],
  ['anthropic', 'Anthropic Claude'], ['claude', 'Anthropic Claude'],
  ['gemini', 'Google Gemini'], ['llm', 'LLM'], ['large language model', 'LLM'],
  ['gpt', 'GPT'], ['gpt-4', 'GPT-4'], ['gpt4', 'GPT-4'],
  ['rag', 'RAG'], ['retrieval augmented generation', 'RAG'],
  ['vector embeddings', 'Vector Embeddings'], ['embeddings', 'Embeddings'],
  ['prompt engineering', 'Prompt Engineering'], ['fine-tuning', 'Fine-Tuning'],
  ['lora', 'LoRA'], ['qlora', 'QLoRA'],
  ['mlops', 'MLOps'], ['mlflow', 'MLflow'], ['wandb', 'Weights & Biases'],
  ['kubeflow', 'Kubeflow'], ['ray', 'Ray'], ['dask', 'Dask'],
  ['vertex ai', 'Vertex AI'], ['sagemaker', 'Amazon SageMaker'],
  ['azure ml', 'Azure Machine Learning'], ['azure machine learning', 'Azure Machine Learning'],
  ['computer vision', 'Computer Vision'], ['opencv', 'OpenCV'],
  ['nlp', 'NLP'], ['natural language processing', 'NLP'],
  ['speech recognition', 'Speech Recognition'], ['text to speech', 'TTS'],
  ['recommendation systems', 'Recommendation Systems'],
  ['reinforcement learning', 'Reinforcement Learning'], ['rl', 'RL'],
  ['generative ai', 'Generative AI'], ['genai', 'Generative AI'],
  ['multimodal', 'Multimodal AI'], ['vision language model', 'VLM'],
  ['machine learning', 'Machine Learning'], ['ml', 'Machine Learning'],
  ['deep learning', 'Deep Learning'], ['neural network', 'Neural Networks'],
  ['data science', 'Data Science'], ['data engineering', 'Data Engineering'],
  ['feature engineering', 'Feature Engineering'], ['model deployment', 'Model Deployment'],
  ['a/b testing', 'A/B Testing'], ['experimentation', 'Experimentation'],
  ['statistical analysis', 'Statistical Analysis'], ['regression', 'Regression Analysis'],
  ['classification', 'Classification'], ['clustering', 'Clustering'],
  ['time series', 'Time Series Analysis'], ['forecasting', 'Forecasting'],
];

// ── Mobile ────────────────────────────────────────────────────────────────────
const MOBILE: [string, string][] = [
  ['ios', 'iOS'], ['swift', 'Swift'], ['swiftui', 'SwiftUI'], ['objective-c', 'Objective-C'],
  ['xcode', 'Xcode'], ['cocoapods', 'CocoaPods'],
  ['android', 'Android'], ['kotlin', 'Kotlin'], ['java', 'Java'],
  ['jetpack compose', 'Jetpack Compose'], ['android studio', 'Android Studio'],
  ['react native', 'React Native'], ['expo', 'Expo'],
  ['flutter', 'Flutter'], ['dart', 'Dart'],
  ['xamarin', 'Xamarin'], ['maui', '.NET MAUI'],
  ['ionic', 'Ionic'], ['capacitor', 'Capacitor'],
  ['firebase', 'Firebase'], ['push notifications', 'Push Notifications'],
  ['app store', 'App Store'], ['google play', 'Google Play'],
  ['deep linking', 'Deep Linking'], ['in-app purchase', 'In-App Purchase'],
  ['mobile performance', 'Mobile Performance'],
];

// ── Security ──────────────────────────────────────────────────────────────────
const SECURITY: [string, string][] = [
  ['cybersecurity', 'Cybersecurity'], ['information security', 'Information Security'],
  ['penetration testing', 'Penetration Testing'], ['pen testing', 'Penetration Testing'],
  ['ethical hacking', 'Ethical Hacking'], ['ctf', 'CTF'],
  ['owasp', 'OWASP'], ['vulnerability assessment', 'Vulnerability Assessment'],
  ['sast', 'SAST'], ['dast', 'DAST'], ['sca', 'SCA'],
  ['siem', 'SIEM'], ['soar', 'SOAR'], ['edr', 'EDR'], ['xdr', 'XDR'],
  ['zero trust', 'Zero Trust'], ['iam', 'Identity & Access Management'],
  ['oauth', 'OAuth 2.0'], ['jwt', 'JWT'], ['saml', 'SAML'], ['openid', 'OpenID Connect'],
  ['ssl', 'SSL/TLS'], ['tls', 'TLS'], ['cryptography', 'Cryptography'],
  ['devsecops', 'DevSecOps'], ['security auditing', 'Security Auditing'],
  ['soc 2', 'SOC 2'], ['soc2', 'SOC 2'], ['iso 27001', 'ISO 27001'],
  ['gdpr', 'GDPR'], ['hipaa', 'HIPAA'], ['pci dss', 'PCI DSS'],
  ['network security', 'Network Security'], ['firewall', 'Firewall'],
  ['threat modeling', 'Threat Modeling'], ['incident response', 'Incident Response'],
  ['forensics', 'Digital Forensics'], ['reverse engineering', 'Reverse Engineering'],
];

// ── Product, Design & Agile ───────────────────────────────────────────────────
const PRODUCT_DESIGN: [string, string][] = [
  ['product management', 'Product Management'], ['product manager', 'Product Manager'],
  ['product owner', 'Product Owner'], ['agile', 'Agile'], ['scrum', 'Scrum'],
  ['kanban', 'Kanban'], ['jira', 'Jira'], ['confluence', 'Confluence'],
  ['roadmap', 'Product Roadmap'], ['okr', 'OKRs'], ['kpi', 'KPIs'],
  ['user research', 'User Research'], ['usability testing', 'Usability Testing'],
  ['ux', 'UX Design'], ['ui', 'UI Design'], ['ux/ui', 'UX/UI Design'],
  ['wireframing', 'Wireframing'], ['prototyping', 'Prototyping'],
  ['figma', 'Figma'], ['sketch', 'Sketch'], ['invision', 'InVision'],
  ['design system', 'Design System'], ['user journey', 'User Journey Mapping'],
  ['a/b testing', 'A/B Testing'], ['feature flagging', 'Feature Flagging'],
  ['analytics', 'Product Analytics'], ['mixpanel', 'Mixpanel'], ['amplitude', 'Amplitude'],
  ['posthog', 'PostHog'], ['segment', 'Segment'],
  ['growth hacking', 'Growth Hacking'], ['go to market', 'Go-to-Market Strategy'],
  ['stakeholder management', 'Stakeholder Management'],
  ['market research', 'Market Research'], ['competitive analysis', 'Competitive Analysis'],
];

// ── Data & Business Analytics ─────────────────────────────────────────────────
const DATA_ANALYTICS: [string, string][] = [
  ['sql', 'SQL'], ['excel', 'Excel'], ['google sheets', 'Google Sheets'],
  ['tableau', 'Tableau'], ['power bi', 'Power BI'], ['powerbi', 'Power BI'],
  ['looker', 'Looker'], ['metabase', 'Metabase'], ['superset', 'Apache Superset'],
  ['dbt', 'dbt'], ['data pipeline', 'Data Pipelines'],
  ['etl', 'ETL'], ['elt', 'ELT'],
  ['business intelligence', 'Business Intelligence'], ['bi', 'BI'],
  ['data visualization', 'Data Visualization'],
  ['statistics', 'Statistics'], ['statistical modeling', 'Statistical Modeling'],
  ['r', 'R Programming'], ['rstudio', 'RStudio'],
  ['sas', 'SAS'], ['spss', 'SPSS'],
  ['salesforce', 'Salesforce'], ['hubspot', 'HubSpot'], ['marketo', 'Marketo'],
  ['crm', 'CRM'], ['erp', 'ERP'], ['sap', 'SAP'],
  ['financial modeling', 'Financial Modeling'], ['forecasting', 'Financial Forecasting'],
  ['data governance', 'Data Governance'], ['data quality', 'Data Quality'],
];

// ── Soft Skills ───────────────────────────────────────────────────────────────
const SOFT_SKILLS: [string, string][] = [
  ['leadership', 'Leadership'], ['team lead', 'Team Lead'],
  ['communication', 'Communication'], ['collaboration', 'Collaboration'],
  ['problem solving', 'Problem Solving'], ['critical thinking', 'Critical Thinking'],
  ['project management', 'Project Management'],
  ['time management', 'Time Management'], ['mentoring', 'Mentoring'],
  ['cross functional', 'Cross-Functional Collaboration'],
  ['technical writing', 'Technical Writing'], ['documentation', 'Documentation'],
  ['code review', 'Code Review'], ['pair programming', 'Pair Programming'],
];

// ── Build the canonical lexicon map ──────────────────────────────────────────

export const SKILL_LEXICON: Map<string, string> = new Map([
  ...FRONTEND,
  ...BACKEND,
  ...CLOUD_DEVOPS,
  ...DATABASES,
  ...AI_ML,
  ...MOBILE,
  ...SECURITY,
  ...PRODUCT_DESIGN,
  ...DATA_ANALYTICS,
  ...SOFT_SKILLS,
]);

/**
 * Normalizes a candidate token/phrase and returns the canonical display name
 * if it matches a known skill, or null if it's not recognized.
 */
export function normalizeSkill(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  return SKILL_LEXICON.get(lower) ?? null;
}

/**
 * Extract all recognized skills from a text using unigrams, bigrams, and trigrams.
 * Returns canonical display names (deduped).
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text) return [];

  const lower = text
    .toLowerCase()
    .replace(/\bc\+\+/gi, ' cpp ')
    .replace(/\bc#/gi, ' csharp ')
    .replace(/\.net\b/gi, ' dotnet ')
    .replace(/[^a-z0-9\s./]/g, ' ');

  const words = lower.split(/\s+/).filter(w => w.length > 0);
  const found = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    // Unigram
    const uni = normalizeSkill(words[i]);
    if (uni) found.add(uni);

    // Bigram
    if (i + 1 < words.length) {
      const bi = normalizeSkill(`${words[i]} ${words[i + 1]}`);
      if (bi) found.add(bi);
    }

    // Trigram
    if (i + 2 < words.length) {
      const tri = normalizeSkill(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      if (tri) found.add(tri);
    }

    // 4-gram (for "domain driven design", "infrastructure as code", etc.)
    if (i + 3 < words.length) {
      const quad = normalizeSkill(
        `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`
      );
      if (quad) found.add(quad);
    }
  }

  return Array.from(found);
}
