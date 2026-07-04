/* topics/iac/sys.js -- topic 8 system map. intro + stages[] (exactly one cur:true, the IaC
   engine) + pivots[] (7; chips carry the 8-topic INDEX in parens for topic-refs, plain names
   for non-topic pivots) + heads. Chip arrows use single-backslash \u2192. 7-bit ASCII. */
var TOPIC_IAC_SYS = {
  intro:'Zoom out: IaC is the <b>boundary between declared infrastructure and provisioned reality</b>, driving one into the other at deploy time. Upstream, engineers declare the desired estate as code; downstream, the real cloud holds whatever exists. The engine diffs config against a locked state file and applies the plan &mdash; converging reality to intent, reviewably, rather than clicking and hoping.',
  stages:[
    { n:'Declared infrastructure', d:'The desired shape of the estate as code &mdash; resources and their relationships, version-controlled, code-reviewed, and reproducible.' },
    { n:'The IaC engine', d:'Graph, plan, state, orchestration &mdash; the platform-agnostic tool that diffs declared config against state and drives reality to match. Declarative converge, not imperative scripting.', cur:true },
    { n:'State', d:'The remote, locked, encrypted source of truth mapping each config address to a real resource ID &mdash; how the tool knows what exists, and the artifact everything depends on.' },
    { n:'Plan &amp; review', d:'The diff (create / update / destroy), reviewed in CI before a gated apply &mdash; the safety gate where destroys and replacements are caught before they are real.' },
    { n:'Providers', d:'Per-platform CRUD-and-schema adapters translating declarative config into concrete API calls &mdash; AWS, GCP, and SaaS &mdash; and supplying the truth for refresh and replacement detection.' },
    { n:'Provisioned reality', d:'The real cloud resources, kept converged to config and watched for drift &mdash; the reality the engine continuously drives declared intent into at each apply.' }
  ],
  pivots:[
    { q:'This declares desired state and detects drift &mdash; how is it different from the reconciler you built for the device fleet?',
      chip:'\u2192 Desired State (7)',
      a:'<b>Same pattern, opposite operating points.</b> IaC is deploy-time, human-triggered, and occasional, reconciling <i>infrastructure</i> whose state it reads authoritatively from provider APIs; the fleet reconciler is runtime, autonomous, and continuous, reconciling <i>device config</i> that devices self-report, with maintenance windows and per-tenant resolution. Same declarative converge / diff / drift philosophy; you build the custom engine because Terraform&rsquo;s execution model can&rsquo;t be a live fleet control loop.' },
    { q:'You provision the S3 bucket that stores firmware. How do you make sure it&rsquo;s hardened by default, every time?',
      chip:'\u2192 AWS Hardening (4)',
      a:'IaC is <b>how you make hardening the default</b> &mdash; the bucket&rsquo;s block-public-access, default encryption, TLS-only policy, and versioning are declared in code (or a curated module), so every bucket is provisioned hardened, reviewed in the plan, and drift back to insecure is detectable. The hardening topic defines <i>what</i> secure looks like; IaC is the mechanism that makes it consistent and enforceable via policy-as-code, not a checklist someone might skip.' },
    { q:'IaC provisions the DynamoDB table, but the per-device attribute values live inside it. Where&rsquo;s the boundary?',
      chip:'\u2192 Attribute Store (6)',
      a:'The line is <b>infrastructure config vs application config</b>. IaC provisions the <i>container</i> &mdash; the table, its capacity mode, indexes, IAM &mdash; changed rarely and reviewed as code. The attribute store manages the <i>contents</i> &mdash; per-device values resolved and written at runtime, changing constantly. You don&rsquo;t put runtime data in Terraform (it&rsquo;d churn state endlessly), and you don&rsquo;t provision tables from the app. Same converge idea at two very different cadences &mdash; one deploy-time, one runtime.' },
    { q:'Your provider plugins and shared modules are third-party code that runs with your cloud credentials. How do you trust them?',
      chip:'\u2192 Signing (2)',
      a:'It&rsquo;s a <b>supply-chain trust</b> problem, the same class the signing topic addresses. Providers and modules execute with your credentials, so you pin versions, verify checksums / signatures (Terraform verifies provider signatures against a registry key), vendor or mirror them so a compromised upstream can&rsquo;t silently change what you run, and review module source before adoption. Signing guarantees the artifact you run is the authentic one; here the artifacts are the plugins and modules that build your entire estate.' },
    { q:'Multi-tenant across multiple AWS accounts &mdash; how does isolation map onto the IaC setup?',
      chip:'\u2192 Tenant Authorization (3)',
      a:'Isolation becomes <b>separate accounts and separate state</b>, structurally. Hard tenant/environment boundaries map to separate AWS accounts (independent credentials, quotas, blast radius) with separate state per account, so one apply can never reach another&rsquo;s resources &mdash; the infrastructure-level echo of the authorization topic&rsquo;s per-tenant scoping. IaC also provisions the IAM roles and policies that <i>enforce</i> that authorization boundary, so the isolation is both structural (accounts/state) and declared (the access policies as code).' },
    { q:'How does this fit a GitOps workflow &mdash; git as the source of truth for infrastructure?',
      chip:'\u2192 GitOps',
      a:'IaC <b>is the substrate GitOps runs on</b>: the desired state lives in git, changes flow through pull requests, plan is posted to the PR for review, and merge triggers a gated apply from CI &mdash; so git history is the audit log and the reviewed diff is the change record. GitOps adds the discipline that <i>nothing</i> is applied outside that flow (no laptop applies), and often a controller continuously reconciling the cluster/estate toward the git-declared state &mdash; which is, again, the converge pattern, now with git as the declared source.' },
    { q:'How do you stop someone merging infrastructure that violates security or cost rules?',
      chip:'\u2192 Policy as code',
      a:'<b>Policy-as-code gates in the pipeline.</b> Tools like OPA/Conftest or Sentinel evaluate the plan JSON against rules &mdash; no public security groups, encryption required, approved instance types, mandatory tags, no destroys of critical resources &mdash; and fail the build on violation, so non-compliant infra can&rsquo;t merge. Paired with security linters (tfsec/checkov) and cost estimation on the PR, it moves compliance <i>left</i> to review time: guardrails are enforced automatically against the diff, not discovered in an audit after the fact.' }
  ],
  heads:{
    whereHead:'Where the provisioning boundary sits',
    pivHead:'Pivots an interviewer rides',
    pivSub:'From a plan / apply question into state, the reconciler next door, and the systems IaC provisions &mdash; each chip is a door a strong answer opens on purpose.'
  }
};
