# First Principles Framework (FPF) - Specification Outline


## Preface (non-normative)

- **FPF is a first principle based architecture decisions for transdiciplinary SoTA methods of evolving holons: systems, epistemes, communities.**
  - Status: full text
  - Summary: FPF serves the Engineer, Researcher, and Manager by providing a generative pattern language for constructing and evolving thought, designed as an "operating system for thought".
- **Creativity in Open-Ended Evolution and Assurance***
  - Status: full text
  - Summary: FPF integrates assurance (audits, evidence) and creativity (generating novel ideas) as complementary engines for responsible innovation, providing a structured choreography for creative work from abduction to operation.
- **Navigating Uncertainty: Building Closed Worlds within an Open World**
  - Status: full text
  - Summary: Explains how FPF reconciles Open-World and Closed-World assumptions, using Bounded Contexts to create reliable 'islands of closure' for engineering decisions within an inherently open world.
- **FPF as an Evolutionary Architecture for Thought**
  - Status: full text
  - Summary: Positions FPF as an architecture for the reasoning process itself, designed to sustain key characteristics like auditability, evolvability, and falsifiability by applying architectural thinking to the dynamics of reasoning.
- **Architectural Characteristic of Thought**
  - Status: full text
  - Summary: Details the key characteristics of rigorous thought (e.g., Auditability, Evolvability, Composability) and the specific FPF mechanisms designed to preserve them.
- **Beyond Cognitive Biases: FPF as a Generative Architecture for Thought**
  - Status: full text
  - Summary: Contrasts FPF's generative, structural approach to avoiding cognitive errors with the traditional corrective, diagnostic approach of hunting for biases, framing FPF as a scaffold that makes errors harder to commit.
- **Thinking Through Writing: The FPF Discipline of Conceptual Work**
  - Status: full text
  - Summary: Describes how FPF uses a discipline of "thinking through writing" with conceptual forms (Cards, Tables, Records) to make thought tangible, shareable, and auditable, while remaining tool-agnostic.
- **Descriptive Ontologies vs. A Thinking-Oriented Architecture**
  - Status: full text
  - Summary: Differentiates FPF's goal of orchestrating reasoning from classical ontologies' goal of cataloging existence, emphasizing FPF's focus on objectives, trust, and dynamics.
- **The "Bitter Lesson" trajectory — compute, data, and freedom over hand‑tuned rules (FPF stance)**
  - Status: full text
  - Summary: How FPF operationalizes the contemporary trend: prefer general models + data + compute + minimal constraints; autonomy budgets; rule‑of‑constraints vs instruction‑of‑procedure; continuous adaptation.
- **From Flat Documents to High-Dimensional Truth: The Multi-View Architecture**
  - Status: full text
  - Summary: Shows how FPF replaces flat documents with a multi-view architecture: epistemes as slot graphs, engineering views as projections, and MVPK as typed publication surfaces that keep dashboards lawfully tethered to work and evidence.
- **Boundary Statements: Where Language Becomes a System Boundary**
  - Status: full text
  - Summary: Introduces the A.6 boundary cluster: why certain sentences behave like contracts, and how routing (laws vs gates vs duties vs evidence) keeps them evolvable and multi-view safe.
- **Raising Semantic Precision: From Triggers to Math‑Backed Ontics**
  - Status: full text
  - Summary: Describes the precision-upgrade workflow behind A.6.P: detect umbrella words, unpack the local ontology, choose a stable mathematical substrate, refactor the model, and mint precise lexemes + guardrails (Tech/Plain twins).
- **The “big storylines” unique to FPF (load‑bearing commitments)**
  - Status: full text
  - Summary: Lists the nine core, load-bearing commitments that define FPF's unique architectural and philosophical stance, from its holonic kernel to its explicit treatment of creativity and assurance.
- **Transdisciplinarity as a Meta‑Theory of Thinking**
  - Status: full text
  - Summary: Explains how FPF treats transdisciplinarity as a meta-theory for designing reasoning, using FPF patterns as generative scaffolds grounded in physical reality to bridge disciplinary silos.
- **FPF as a Culinary Architecture for Collective Thought: Why We Formalize “Obvious” Ideas**
  - Status: full text
  - Summary: Uses the 'culinary architecture' analogy to explain FPF's role in synthesizing 'obvious' ideas into a robust framework for complex, generative problems.
- **Intellect Stack (informative Overview)**
  - Status: full text
  - Summary: Presents a five-layer pedagogical map of cognitive skills (Structure → Knowledge → Action → Strategy → Governance) and links them to FPF patterns.
- **Purpose, Scope, and Explicit Non‑Goals**
  - Status: full text
  - Summary: Clarifies FPF's mission as a generative scaffold for thought, its scope as tool-agnostic normative patterns, and what it explicitly is not (e.g., a domain encyclopedia or a specific methodology).

## Part A - Kernel Architecture Cluster


#### A.0 Onboarding Glossary (NQD & E/E‑LOG)
- **Status:** Stable
- *Keywords:* novelty, quality‑diversity (NQD), explore/exploit (E/E‑LOG), portfolio (set), illumination map (report‑only telemetry), parity run, comparability, ReferencePlane, CL^plane, ParetoOnly default. *Queries:* "What is NQD in FPF?", "How does FPF handle creative generation?", "What is an explore-exploit policy in FPF?"
- **Builds on:** E.2, A.5, C.17–C.19. **Coordinates with:** E.7, E.8, E.10; F.17; G.5, G.9–G.12. **Constrains:** Any pattern/UTS row that describes a generator, selector, or portfolio.

### Cluster A.I - Foundational Ontology


#### A.1 Holonic Foundation: Entity → Holon
- **Status:** Stable
- *Keywords:* part-whole composition, system boundary, entity, holon, U.System, U.Episteme. *Queries:* "How does FPF model a system and its parts?", "What is a holon?", "Difference between entity and system."
- **Builds on:** P-8 Cross-Scale Consistency. **Prerequisite for:** A.1.1, A.2, A.14, B.1.

#### A.1.1 `U.BoundedContext`: The Semantic Frame
- **Status:** Stable
- *Keywords:* local meaning, context, semantic boundary, domain, invariants, glossary, DDD. *Queries:* "How does FPF handle ambiguity?", "What is a Bounded Context in FPF?", "How to define rules for a specific project?"
- **Builds on:** A.1. **Prerequisite for:** A.2.1, F.0.1.

#### A.2 Role Taxonomy
- **Status:** Stable
- *Keywords:* role, assignment, holder, context, function vs identity, responsibility, U.RoleAssignment. *Queries:* "How to model responsibilities?", "What is the difference between what a thing *is* and what it *does*?"
- **Builds on:** A.1, A.1.1. **Prerequisite for:** A.2.1-A.2.6, A.13, A.15.

#### A.2.1 `U.RoleAssignment`: Contextual Role Assignment
- **Status:** Stable
- *Keywords:* Standard, holder, role, context, RoleEnactment, RCS/RSG. *Queries:* "How to formally assign a role in FPF?", "What is the Holder#Role:Context Standard?"
- **Refines:** A.2. **Prerequisite for:** A.15.

#### A.2.2 `U.Capability`: System Ability (dispositional property)
- **Status:** Stable
- *Keywords:* ability, skill, performance, action, work scope, measures. *Queries:* "How to separate ability from permission?", "What is a capability in FPF?"
- **Builds on:** A.2. **Informs:** A.15, A.2.3.

#### A.2.3 `U.ServiceClause`: The Service Promise Clause
- **Status:** Stable
- *Keywords:* service clause, promise content, accessSpec, acceptanceSpec, SLO, SLA, claim scope (G), Work evidence, provider/consumer roles, deprecated alias `U.Service`. *Queries:* "What is a service clause in FPF?", "Service clause vs Work vs MethodDescription", "How do access and acceptance differ?", "How is SLO/SLA adjudicated from Work evidence?"
- **Builds on:** A.2.2. **Prerequisite for:** F.12. **Used by:** A.2.8, A.6.C, A.6.8.

#### A.2.4 `U.EvidenceRole`: The Evidential Stance
- **Status:** Stable
- *Keywords:* evidence, claim, support, justification, episteme. *Queries:* "How does an episteme serve as evidence?", "Modeling evidence roles."
- **Builds on:** A.2. **Informs:** A.10, B.3.

#### A.2.5 `U.RoleStateGraph`: The Named State Space of a Role
- **Status:** Stable
- *Keywords:* state machine, RSG, role state, enactability, lifecycle. *Queries:* "How to model the state of a role?", "What is a Role State Graph?"
- **Builds on:** A.2.1. **Prerequisite for:** A.15.

#### A.2.6 Unified Scope Mechanism (USM): Context Slices & Scopes
- **Status:** Stable
- *Keywords:* scope, applicability, ClaimScope (G), WorkScope, set-valued. *Queries:* "How to define the scope of a claim or capability?", "What is G in F-G-R?"
- **Builds on:** A.1.1. **Constrains:** A.2.2, A.2.3, B.3.

#### A.2.7 `U.RoleAlgebra`: In-Context Role Relations (`≤`, `⊥`, `⊗`)
- **Status:** New
- *Keywords:* role algebra, specialization (`≤`), incompatibility (`⊥`), bundles (`⊗`), separation of duties (SoD), requiredRoles substitution. *Queries:* "What does `RoleS ≤ RoleG` mean in FPF?", "How do I encode Separation of Duties with `⊥`?", "How do role bundles (`⊗`) work?"
- **Builds on:** A.2. **Prerequisite for:** A.15, A.2.5.

#### A.2.8 `U.Commitment`: Deontic Commitment Object
- **Status:** Stable
- *Keywords:* commitment, deontics, obligation/permission/prohibition, modality normalization, scope+validity window, adjudication hooks, evidenceRefs, BCP‑14 (RFC 2119/8174). *Queries:* "How to represent MUST/SHALL as a lintable object?", "How to keep deontics separate from admissibility gates?", "How to make commitments auditable via evidence hooks?"
- **Refines:** A.2. **Builds on:** A.2.1, A.2.3, A.2.6, A.7, A.15.1. **Used by:** A.6.B (Quadrant D), A.6.C.

#### A.2.9 `U.SpeechAct`: Communicative Work Object
- **Status:** Stable
- *Keywords:* speech act, communicative work, approval/authorization/publication/revocation, provenance, act≠utterance≠carrier, judgement context, window/freshness, institutes.*. *Queries:* "How to model approvals/authorizations as Work?", "How to separate act vs utterance vs carrier?", "How to link commitments to instituting acts without commitment-by-publication?"
- **Refines:** A.2. **Builds on:** A.2.1, A.2.6, A.7, A.10, A.15.1. **Used by:** A.2.8, A.6.C (utterance/instituting-act hook).

### Cluster A.II - Transformation Engine


#### A.3 Transformer Constitution (Quartet)
- **Status:** Stable
- *Keywords:* action, causality, change, System-in-Role, MethodDescription, Method, Work. *Queries:* "How does FPF model an action or a change?", "What is the transformer quartet?"
- **Builds on:** A.2. **Prerequisite for:** A.3.1, A.3.2, A.15.

#### A.3.1 `U.Method`: The Abstract Way of Doing
- **Status:** Stable
- *Keywords:* recipe, how-to, procedure, abstract process. *Queries:* "What is a Method in FPF?", "Difference between Method and Work."
- **Refines:** A.3. **Prerequisite for:** A.15.

#### A.3.2 `U.MethodDescription`: The Recipe for Action
- **Status:** Stable
- *Keywords:* specification, recipe, SOP, code, model, epistemic artifact. *Queries:* "How to document a procedure?", "What is a MethodDescription?"
- **Refines:** A.3. **Informs:** A.15.

#### A.3.3 `U.Dynamics`: The Law of Change
- **Status:** Stable
- *Keywords:* state evolution, model, simulation, state space. *Queries:* "How to model state transitions or system dynamics?", "Difference between a Method and Dynamics."
- **Builds on:** A.19. **Informs:** B.4.

### Cluster A.III - Time & Evolution


#### A.4 Temporal Duality & Open-Ended Evolution Principle
- **Status:** Stable
- *Keywords:* design-time, run-time, evolution, versioning, lifecycle, continuous improvement. *Queries:* "How does FPF handle plan vs. reality?", "How are systems updated?"
- **Builds on:** P-10 Open-Ended Evolution. **Prerequisite for:** B.4.

### Cluster A.IV - Kernel Modularity


#### A.5 Open-Ended Kernel & Extension Layering
- **Status:** Transitional stub
- *Keywords:* FPF architecture, specialization vs dependancy hierarhies, modularity, extensibility. *Queries:* "What is the architecture of FPF?", "How are new domains added?"
- **Builds on:** P-4, P-5.

### Cluster A.IV.A - Signature Stack & Boundary Discipline (A.6.*)


#### A.6 Signature Stack & Boundary Discipline
- **Status:** Stable
- *Keywords:* boundary, signature stack, routing, laws, admissibility, deontics, evidence, claim register, MVPK, view/viewpoint, surface. *Queries:* "What is the Signature Stack in FPF?", "How do I route boundary statements (laws vs gates vs duties vs evidence)?", "How to avoid contract-soup drift in boundary descriptions?"
- **Builds on:** E.8, A.6.0, A.6.1, A.6.3, E.17.0, E.17, A.7, F.18, E.10.D2, E.10/L-SURF. **Coordinates with:** A.6.5, A.6.6, A.6.7, E.19.

#### A.6.B Boundary Norm Square (Laws / Admissibility / Deontics / Work-Effects)
- **Status:** Stable
- *Keywords:* boundary norm square, atomic claims, L/A/D/E routing, laws vs gates, commitments, evidence carriers, no upward dependencies, claim IDs, triangle decomposition. *Queries:* "What is the Boundary Norm Square in FPF?", "How to decompose a mixed sentence into gate/duty/evidence claims?", "Where do RFC keywords belong in FPF patterns?"
- **Builds on:** E.8, A.6.0, A.6.1, A.6.3, E.17.0, E.17, A.7, F.18, E.10.D2, E.10/L-SURF. **Used by:** A.6 (cluster overview).

#### A.6.0 U.Signature — Universal, law‑governed declaration
- **Status:** Stable
- *Keywords:* signature, vocabulary, laws, applicability, bounded context. *Queries:* "What is the universal signature block?", "Where do laws vs. implementations live?"
- **Placement:** Kernel; **Coordinates:** A.6.1.

#### A.6.1 U.Mechanism - Law‑governed application to a SubjectKind over a BaseType
- **Status:** Stable
- Keywords: Mechanism, OperationAlgebra, LawSet, AdmissibilityConditions, Transport, Bridge‑only. Queries: "How to define a mechanism like USM/UNM?", "Where do operational guards live?", "How to handle cross‑context transport?"
- **Builds on:** A.6.0, E.10.D1. **Instances:** USM (A.2.6), UNM (A.19).

#### A.6.2 U.EffectFreeEpistemicMorphing — Effect-Free Morphisms of Epistemes
- **Status:** Stable
- *Keywords:* episteme, effect-free, morphism, functoriality, describedEntity, lenses, reproducibility. *Queries:* "How to transform descriptions/specs without mechanisms?", "What are conservative episteme-to-episteme transforms in FPF?", "How do Describe_ID / Specify_DS fit into a general morphism class?"
- **Builds on:** A.1 (Holon), A.7 (Strict Distinction, Object≠Description≠Carrier), A.6.0 (U.Signature), A.6.5 (U.RelationSlotDiscipline), E.10.D2 (I/D/S discipline), C.2.1 (U.EpistemeSlotGraph). **Used by:** A.6.3 (U.EpistemicViewing), A.6.4 (U.EpistemicRetargeting), E.17.0 (U.MultiViewDescribing), E.17 (MVPK), E.18 (E.TGA StructuralReinterpretation), KD-CAL mapping rules.

#### A.6.3 U.EpistemicViewing — describedEntity-Preserving Morphism
- **Status:** Stable
- *Keywords:* episteme, view, EpistemicViewing, describedEntity preservation, ClaimGraph, Viewpoint, RepresentationScheme, CorrespondenceModel, Direct vs Correspondence Viewing, optics, displayed fibration. *Queries:* "How to define a view of an artefact without adding new claims?", "What is an EpistemicViewing in FPF terms?", "How do ISO 42010 views and SysML v2 views-as-queries sit in FPF?"
- **Builds on:** A.6.0 (U.Signature), A.6.2 (U.EffectFreeEpistemicMorphing), A.6.5 (U.RelationSlotDiscipline), A.7 (Strict Distinction; I/D/S vs Surface), E.10.D2 (I/D/S discipline), C.2.1 (U.EpistemeSlotGraph), C.2 (KD-CAL: describedEntity & ReferencePlane). **Used by:** E.17.0 (U.MultiViewDescribing), E.17 (MVPK), E.17.1/E.17.2 (ViewpointBundleLibrary & TEVB), E.18 (E.TGA viewpoint families), B.5.3 (Role-Projection Bridge), KD-CAL view operators.

#### A.6.4 U.EpistemicRetargeting — describedEntity-Retargeting Morphism
- **Status:** Stable
- *Keywords:* retargeting, subject retargeting, describedEntity shift, KindBridge, SquareLaw-retargeting, StructuralReinterpretation. *Queries:* "How to change the object-of-talk without losing truth?", "What is StructuralReinterpretation in FPF terms?", "When is a Fourier-like transform a retargeting rather than a new Γ-construction?"
- **Builds on:** A.6.2 (effect-free episteme morphisms), A.1 (Holon: System/Episteme split), F.9 (Bridges & CL, including CL^plane and KindBridge), C.2.1 (U.EpistemeSlotGraph; DescribedEntity/GroundingHolon), C.2 (KD-CAL: ReferencePlane & CL propagation), E.18:5.9/E.18:5.12 (E.TGA crossings & StructuralReinterpretation rules). **Used by:** E.18 (StructuralReinterpretation node in E.TGA as species of U.EpistemicRetargeting), KD-CAL/LOG-CAL retargeting rules, Fourier-style transforms and data↔model re-targetings in discipline packs.

#### A.6.P U.RelationalPrecisionRestorationSuite — Relational Precision Restoration (RPR) — Kind‑Explicit Qualified Relation Discipline
- **Status:** Stable
- *Keywords:* relation precision restoration, under‑specified relations, umbrella verbs, RelationKind, QualifiedRelationRecord, hidden arity, polarity, change‑class lexicon, lexical guardrails. *Queries:* "What is A.6.P in FPF?", "How do I rewrite under‑specified relational prose?", "How do A.6.5 and A.6.6 specialise the RPR suite?"
- **Builds on:** A.6, A.6.B, A.6.S, A.6.0, A.6.5, E.8, E.10, F.18. **Coordinates with:** A.2.6, A.10, C.3.3, E.17, F.9. **Specialised by:** A.6.5, A.6.6 (and future A.6.x).

#### A.6.5 U.RelationSlotDiscipline - SlotKind / ValueKind / RefKind discipline for n‑ary relations (with slot‑operation lexicon)
- **Status:** Stable
- *Keywords:* slot, argument position, value, reference, signature, substitution, pass-by-value, pass-by-reference. *Queries:* “How do I declare positions and references in relations?”, “How do we stop mixing roles, values and ids in signatures?”, “How does SlotKind/ValueKind/RefKind interact with I/D/S and Epistemes?”
- **Builds on:** A.6.0 (U.Signature), A.1 (Holon), A.7 (Strict Distinction), E.8 (pattern authoring discipline), E.10 (LEX-BUNDLE; Tech/Plain registers). **Used by:** C.2.1 (U.EpistemeSlotGraph), A.6.2–A.6.4 (episteme morphisms), B.5.* (RoleEnactment), C.3.* (Kinds & KindSignature), E.17.0 (U.MultiViewDescribing), discipline-packs for methods/services.

#### A.6.6 U.BaseDeclarationDiscipline - Kind-explicit, scoped, witnessed base declaration discipline (with base-change lexicon)
- **Status:** Stable
- *Keywords:* base declaration, basedness, baseRelation, SWBD, witnesses, scope, Γ_time, anchoring, rebase, retime, rescope. *Queries:* "What is U.BaseDeclarationDiscipline?", "How to model base-dependence without anchoring?", "What is a ScopedWitnessedBaseDeclaration (SWBD)?"
- **Builds on:** A.6.0, A.6.5, A.2.6, A.2.4, A.7, E.8, E.10. **Coordinates with:** A.10, A.14, C.2.1, A.6.3–A.6.4, C.3.3, E.18, F.9, F.15, F.18. **Used by:** base-relative admissibility/calibration/attribution patterns; anchor* rewrites into explicit `baseRelation(dependent, base)`.

#### A.6.7 `MechSuiteDescription` — Description of a set of distinct mechanisms
- **Status:** Stable
- *Keywords:* mechanism suite, distinct mechanisms, suite obligations, contract pins, CN-Spec, CG-Spec, P2W, planned baseline, crossing visibility. *Queries:* "What is a MechSuiteDescription?", "How to describe a bundle of distinct mechanisms without using MechFamilyDescription?", "How do suite obligations differ from gate decisions?"
- **Builds on:** E.8, A.6.1, A.6.5, E.10, E.19. **Coordinates with:** E.18, A.21. **Used by:** Part G universalization; CHR mechanism stacks.

#### A.6.7.CHR `CHRMechanismSuite` — CHR mechanism-suite anchor (suite obligations + P2W planned baseline)
- **Status:** Stable
- *Keywords:* CHR suite, characterization core, CN-Spec, CG-Spec, legality gate, suite obligations, set-return selection, tri-state guard decision, crossing visibility, Bridge-only transport, penalties→R_eff, planned baseline, `SlotFillingsPlanItem`, P2W seam, no hidden scalarization, no hidden thresholds. *Queries:* "What is CHRMechanismSuite in FPF?", "How do CHR mechanisms cite CN-Spec/CG-Spec?", "How to enforce planned slot filling in WorkPlanning only?", "How to keep UNM/UINDM/ULSAM explicit (no hidden tails)?"
- **Builds on:** A.6.7, A.15.3, A.6.1, A.6.5, A.19, G.0, E.18, E.10, E.19. **Coordinates with:** A.21, G.5, G.10, C.23. **Used by:** Part G universalization; CHR mechanism stacks.

#### A.6.8 Service Polysemy Unpacking (RPR-SERV)
- **Status:** Stable
- *Keywords:* service polysemy, facet unpacking, serviceSituation QRR, service clause vs access point, provider principal, SLA/SLO, server/service provider rewrite. *Queries:* "How to unpack service talk in FPF?", "serviceSituation lens", "service clause vs service access point", "RPR-SERV rules".
- **Builds on:** A.6.P, A.6.B, A.6.5, A.2.3, A.2.8, A.2.9, A.15, E.10, F.17, F.18. **Coordinates with:** A.6.C, A.7, F.8, E.15.

#### A.6.9 `U.CrossContextSamenessDisambiguation` — Repairing cross-context “same / equivalent / align” via explicit Bridges (RPR-XCTX)
- **Status:** Stable
- *Keywords:* cross-context sameness, bridge, alignment, mapping, direction, substitution licence, loss notes, CL, SenseCells, weakest-link. *Queries:* "How to disambiguate 'same' across contexts?", "How to avoid silent inversion in mappings?", "Naming-only vs substitution bridge".
- **Builds on:** A.6.P, F.9, E.10.D1, A.7. **Coordinates with:** E.17, C.3.3, A.6.6, F.7/F.8.

#### A.6.S U.SignatureEngineeringPair — Constructive signature engineering (ConstructorSignature + TargetSignature)
- **Status:** Stable
- *Keywords:* signature engineering, TargetSignature, ConstructorSignature, two-signature arrangement, EFEM, editioning, retargeting, slot/base change lexicon, MVPK views (no new semantics), claim register, no epistemic agency. *Queries:* "What is U.SignatureEngineeringPair in FPF?", "How do I model TargetSignature vs ConstructorSignature (and keep Work out of edits)?", "How do slot/base change verbs compose into a reproducible signature evolution workflow?"
- **Builds on:** A.6.0, A.6.2, A.6.3, A.6.4, A.6.5, A.6.6, A.6.B, A.3, A.7, A.12, C.2.1, E.17, E.10. **Coordinates with:** E.18, E.19.

### Cluster A.V - Constitutional Principles of the Kernel


#### A.7 Strict Distinction (Clarity Lattice)
- **Status:** Stable
- *Keywords:* category error, Object ≠ Description, Role ≠ Work, ontology. *Queries:* "How to avoid common modeling mistakes?", "What are FPF's core distinctions?"
- **Builds on:** A.1, A.2, A.3. **Constrains:** all patterns.

#### A.8 Universal Core (C-1)
- **Status:** Stable
- *Keywords:* universality, transdisciplinary, domain-agnostic, generalization. *Queries:* "How does FPF ensure its concepts are universal?"
- **Builds on:** P-8. **Constrains:** Kernel-level `U.Type`s.

#### A.9 Cross-Scale Consistency (C-3)
- **Status:** Stable
- *Keywords:* composition, aggregation, holarchy, invariants, roll-up. *Queries:* "How do rules compose across different scales?", "How to aggregate metrics safely?"
- **Builds on:** A.1, A.8. **Prerequisite for:** B.1.

#### A.10 Evidence Graph Referring (C-4)
- **Status:** Stable
- *Keywords:* evidence, traceability, audit, provenance, SCR/RSCR. *Queries:* "How are claims supported by evidence?", "How to ensure auditability?"
- **Builds on:** A.1. **Prerequisite for:** B.3.

#### A.11 Ontological Parsimony (C-5)
- **Status:** Stable
- *Keywords:* minimalism, simplicity, Occam's razor, essential concepts. *Queries:* "How does FPF avoid becoming too complex?", "Rule for adding new concepts."
- **Builds on:** P-1 Cognitive Elegance. **Constrains:** all new `U.Type` proposals.

#### A.12 External Transformer & Reflexive Split (C-2)
- **Status:** Stable
- *Keywords:* causality, agency, self-modification, external agent, control loop. *Queries:* "How to model a self-healing or self-calibrating system?", "What is the external transformer principle?"
- **Builds on:** A.3. **Prerequisite for:** B.2.5.

#### A.13 The Agential Role & Agency Spectrum
- **Status:** Stable
- *Keywords:* agency, autonomy, AgentialRole, Agency-CHR, decision-making. *Queries:* "How is agency modeled in FPF?", "What is the agency spectrum?"
- **Builds on:** A.2. **Refined by:** C.9 Agency-CHR.

#### A.14 Advanced Mereology: Components, Portions, Aspects & Phases
- **Status:** Stable
- *Keywords:* mereology, part-of, ComponentOf, PortionOf, PhaseOf, composition. *Queries:* "How to model different kinds of 'part-of' relationships?"
- **Refines:** A.1. **Prerequisite for:** B.1.1.

#### A.15 Role–Method–Work Alignment (Contextual Enactment)
- **Status:** Stable
- *Keywords:* enactment, alignment, plan vs reality, design vs run, MIC, WorkPlan. *Queries:* "How do roles, methods, and work connect?", "How does an intention become an action in FPF?"
- **Integrates:** A.2, A.3, A.4. **Prerequisite for:** all operational models.

#### A.15.1 `U.Work`: The Record of Occurrence
- **Status:** Stable
- *Keywords:* execution, event, run, actuals, log, occurrence. *Queries:* "What is a Work record?", "Where are actual resource costs stored?"
- **Refines:** A.15. **Used by:** B.1.6, all Part D.

#### A.15.2 `U.WorkPlan`: The Schedule of Intent
- **Status:** Stable
- *Keywords:* plan, schedule, intent, forecast. *Queries:* "How to model a plan or schedule?", "Difference between a WorkPlan and a MethodDescription."
- **Refines:** A.15. **Informs:** `U.Work`.

#### A.15.3 `SlotFillingsPlanItem` — Planned Slot-Fillings Baseline (WorkPlanning PlanItem)
- **Status:** Stable
- *Keywords:* planned baseline, slot owner, planned filler, edition pins, `Γ_time` selector, guard pins, WorkPlanning, P2W seam, variance trail. *Queries:* "What is SlotFillingsPlanItem in FPF?", "How to keep planned slot filling separate from FinalizeLaunchValues?", "How to pin editions and time in WorkPlanning baselines?"
- **Builds on:** A.15.2, A.6.5, E.10.D1, E.17, E.18, E.19. **Used by:** A.6.7 (suite contract pins), Part G universalization, suite/kit specialised baselines.

#### A.16 Formality–Openness Ladder (FOL): Building Closed Worlds Inside an Open World
- **Status:** Stub
- *Keywords:* formality levels, rigor, proof, specification, sketch, F0-F9. *Queries:* "How to measure the formality of a document?", "What are the F0-F9 levels?"
- **Builds on:** A.1. **Informs:** B.3.

#### A.17 A.CHR-NORM — Canonical “Characteristic” & rename (Dimension/Axis → Characteristic)
- **Status:** Stable
- *Keywords:* characteristic, measurement, property, attribute, dimension, axis. *Queries:* "What is the correct term for a measurable property?", "How to define a metric?"
- **Prerequisite for:** A.18, A.19, C.16.

#### A.18 A.CSLC-KERNEL — Minimal CSLC in Kernel (Characteristic/Scale/Level/Coordinate)
- **Status:** Stable
- *Keywords:* CSLC, scale, level, coordinate, measurement Standard. *Queries:* "What is the CSLC Standard?", "How to ensure measurements are comparable?"
- **Builds on:** A.17. **Prerequisite for:** all metric-based patterns.

#### A.19 A.CHR-SPACE — CharacteristicSpace & Dynamics hook
- **Status:** Stable
- *Keywords:* state space, CharacteristicSpace, dynamics, state model, RSG. *Queries:* "How to define a system's state space?", "How does FPF model change over time?"
- **Builds on:** A.17, A.18, A.2.5. **Prerequisite for:** A.3.3.

#### A.19.D1 CN‑frame (comparability & normalization)
- **Status:** Stable
- *Keywords:* CN-frame, comparability, normalization, CG-Spec, UNM, CharacteristicSpace, chart, RSG, RSCR. *Queries:* "What is a CN-frame in FPF?", "How does FPF handle normalization for comparison?", "What is a CN-Spec?"
- **Builds on:** A.19. **Coordinates with:** G.0.

#### A.20 U.Flow.ConstraintValidity — Eulerian
- **Status:** Stable
- *Keywords:* flow, ConstraintValidity, Eulerian, TransductionFlow, GateFit, MVPK, SquareLaw, Sentinel, PathSlice. *Queries:* "What is ConstraintValidity in FPF?", "What is the Eulerian stance in FPF flows?", "How does E.TGA relate to flows?"
- **Builds on:** E.18 (E.TGA). **Coordinates with:** A.21, A.22, A.25, A.27, A.28, A.31, A.45.

#### A.21 GateProfilization: `OperationalGate(profile)` (GateFit core)
- **Status:** Stable
- *Keywords:* OperationalGate, GateFit, GateProfile, GateChecks, join-semilattice, `GateDecision`, `DecisionLog`, EquivalenceWitness, LaunchGate, CV⇒GF. *Queries:* "What is GateProfilization in FPF?", "How does OperationalGate aggregate GateChecks?", "What is the CV⇒GF activation predicate?"
- **Builds on:** E.18 (E.TGA), E.17 (MVPK), A.7. **Coordinates with:** A.20, A.23, A.24, A.25, A.26, A.27, A.41.

## Part B — Trans-disciplinary Reasoning Cluster


#### B.1

#### B.1.1 Dependency Graph & Proofs
- **Status:** Stable
- *Keywords:* dependency graph, proofs, structural aggregators, sum, set, slice. *Queries:* "What is the input for the Gamma operator?", "How are aggregation invariants proven in FPF?"
- **Builds on:** B.1.

#### B.1.2 System-specific Aggregation Γ_sys
- **Status:** Stable
- *Keywords:* system aggregation, physical systems, mass, energy, boundary rules, Sys-CAL. *Queries:* "How to aggregate physical systems?", "Conservation laws in FPF aggregation?"
- **Builds on:** B.1, A.1, C.1.

#### B.1.3 Γ_epist — Knowledge-Specific Aggregation
- **Status:** Stable
- *Keywords:* knowledge aggregation, epistemic, provenance, trust, KD-CAL. *Queries:* "How to combine knowledge artifacts?", "How does trust propagate in FPF?"
- **Builds on:** B.1, A.1, C.2.

#### B.1.4 Contextual & Temporal Aggregation (Γ_ctx & Γ_time)
- **Status:** Stable
- *Keywords:* temporal aggregation, time-series, order-sensitive, composition. *Queries:* "How does FPF handle time-series data?", "How to model processes where order matters?"
- **Builds on:** B.1.

#### B.1.5 Γ_method — Order-Sensitive Method Composition & Instantiation
- **Status:** Stable
- *Keywords:* method composition, workflow, sequential, concurrent, plan vs run. *Queries:* "How to combine methods or workflows?", "How does FPF model complex procedures?"
- **Builds on:** B.1, B.1.4, A.3.1.

#### B.1.6 Γ_work — Work as Spent Resource
- **Status:** Stable
- *Keywords:* work, resource aggregation, cost, energy consumption, Resrc-CAL. *Queries:* "How to calculate the total cost of a process?", "How are resources aggregated in FPF?"
- **Builds on:** B.1, A.15.1, C.5.

#### B.2

#### B.2.1 BOSC Triggers
- **Status:** Draft
- *Keywords:* BOSC, triggers for emergence, boundary, objective, supervisor, complexity. *Queries:* "What triggers an MHT?", "What are the BOSC criteria for emergence?"
- **Builds on:** B.2.

#### B.2.2 MST (Sys) — Meta-System Transition
- **Status:** Stable
- *Keywords:* system emergence, super-system, physical emergence. *Queries:* "How do new systems emerge from parts?", "What is a Meta-System Transition?"
- **Builds on:** B.2, B.2.1, A.1.

#### B.2.3 MET (KD) — Meta-Epistemic Transition
- **Status:** Stable
- *Keywords:* knowledge emergence, meta-theory, paradigm shift, scientific revolution. *Queries:* "How do new theories emerge?", "What is a Meta-Epistemic Transition?"
- **Builds on:** B.2, B.2.1, A.1.

#### B.2.4 MFT (Meta-Functional Transition)
- **Status:** Stable
- *Keywords:* functional emergence, capability emergence, adaptive workflow, new process. *Queries:* "How do new capabilities or workflows emerge?", "What is a Meta-Functional Transition?"
- **Builds on:** B.2, B.2.1, A.3.1.

#### B.2.5 Supervisor–Subholon Feedback Loop
- **Status:** Stable
- *Keywords:* control architecture, feedback loop, supervisor, stability, layered control. *Queries:* "How does FPF model control systems?", "What is the supervisor-subholon pattern?"
- **Builds on:** B.2, A.1.

#### B.3

#### B.3.1 Components & Epistemic Spaces
- **Status:** Draft
- *Keywords:* F-G-R components, measurement templates, epistemic space. *Queries:* "How are F, G, and R measured?", "What are epistemic spaces?"
- **Builds on:** B.3.

#### B.3.2 Evidence & Validation Logic (LOG-use)
- **Status:** Draft
- *Keywords:* verification, validation, confidence, logic, proof. *Queries:* "What is the logic for validating claims in FPF?", "Difference between verification and validation."
- **Builds on:** B.3, C.6.

#### B.3.3 Assurance Subtypes & Levels
- **Status:** Stable
- *Keywords:* assurance levels, L0-L2, TA, VA, LA, typing, verification, validation. *Queries:* "What are the assurance levels in FPF?", "How does an artifact mature in FPF?"
- **Builds on:** B.3.

#### B.3.4 Evidence Decay & Epistemic Debt
- **Status:** Stable
- *Keywords:* evidence aging, decay, freshness, epistemic debt, stale data. *Queries:* "How does FPF handle outdated evidence?", "What is epistemic debt?"
- **Builds on:** B.3.

#### B.3.5 CT2R-LOG — Working-Model Relations & Grounding
- **Status:** Stable
- *Keywords:* grounding, constructive trace, working model, assurance layer, CT2R, Compose-CAL. *Queries:* "How are FPF models grounded in evidence?", "What is the CT2R-LOG?"
- **Builds on:** B.3, E.14, C.13.

#### B.4

#### B.4.1 System Instantiation
- **Status:** Stable
- *Keywords:* field upgrade, physical system evolution, deployment. *Queries:* "How are physical systems updated in FPF?"
- **Builds on:** B.4, A.1.

#### B.4.2 Knowledge Instantiation
- **Status:** Stable
- *Keywords:* theory refinement, knowledge evolution, scientific method. *Queries:* "How are scientific theories refined in FPF?"
- **Builds on:** B.4, A.1.

#### B.4.3 Method Instantiation
- **Status:** Stable
- *Keywords:* adaptive workflow, process improvement, operational evolution. *Queries:* "How do workflows or methods evolve in FPF?"
- **Builds on:** B.4, A.3.1.

#### B.5

#### B.5.1 Explore → Shape → Evidence → Operate
- **Status:** Stable
- *Keywords:* development cycle, lifecycle, state machine, Explore, Shape, Evidence, Operate. *Queries:* "What are the development stages of an artifact in FPF?"
- **Builds on:** B.5.

#### B.5.2 Abductive Loop
- **Status:** Stable
- *Keywords:* abduction, hypothesis generation, creativity, innovation. *Queries:* "How does FPF model creative thinking?", "What is the abductive loop?"
- **Builds on:** B.5.

#### B.5.2.1 Creative Abduction with NQD
- **Status:** Stable
- *Keywords:* NQD, novelty, quality, diversity, open-ended search, Pareto front, E/E-LOG. *Queries:* "How to systematically generate creative ideas?", "What is NQD in FPF?"
- **Builds on:** B.5.2, C.17, C.18, C.19.

#### B.5.3 Role-Projection Bridge
- **Status:** Stable
- *Keywords:* domain-specific vocabulary, concept bridge, mapping, terminology. *Queries:* "How does FPF integrate domain-specific language?", "What is a Role-Projection Bridge?"
- **Builds on:** A.2, C.3.

#### B.6

#### B.7

## Part C — Kernel Extention Specifications


#### Cluster C.I – Core CALs / LOGs / CHRs

#### C.1 Sys‑CAL
- **Status:** Draft
- *Keywords:* physical system, composition, conservation laws, energy, mass, resources, U.System. *Queries:* "How to model physical systems in FPF?", "What are conservation laws in FPF?", "Modeling a pump or engine."
- **Builds on:** A.1 Holonic Foundation, A.14. **Coordinates with:** Resrc-CAL. **Prerequisite for:** M-Sys-CAL.

#### C.2 KD‑CAL
- **Status:** Stable
- *Keywords:* knowledge, epistemic, evidence, trust, assurance, F-G-R, Formality, ClaimScope, Reliability, provenance. *Queries:* "What is F-G-R?", "How does FPF handle evidence and trust?", "How to model a scientific theory?".
- **Builds on:** A.1, A.10, B.3. **Prerequisite for:** All patterns using F-G-R, M-KD-CAL.

#### C.2.1 U.Episteme — Epistemes and their slot graph
- **Status:** Stable
- *Keywords:* episteme, EpistemeSlotGraph, DescribedEntitySlot, GroundingHolonSlot, ClaimGraphSlot, ViewpointSlot, ReferenceScheme, RepresentationScheme, View/Viewpoint. *Queries:* "What is an episteme in FPF?", "How are DescribedEntity, ClaimGraph, GroundingHolon and Viewpoint organised as slots?", "How do KD-CAL epistemes connect to views/viewpoints and multi-view descriptions?"
- **Builds on:** C.2 (KD-CAL), A.1 (Holonic Foundation), A.6.5 (U.RelationSlotDiscipline), E.10.D2 (I/D/S discipline). **Used by:** A.6.2–A.6.4 (U.EffectFreeEpistemicMorphing / U.EpistemicViewing / U.EpistemicRetargeting), E.17.0–E.17.2 (U.MultiViewDescribing, Viewpoint bundles, TEVB), E.17 (MVPK), B.1.3 (Γ_epist), discipline-packs that define or consume epistemes.

#### C.2.2 Reliability R in the F–G–R triad
- **Status:** Stable
- *Keywords:* Reliability (R), warrant, evidence-bound, F–G–R, ClaimScope (G), Bridge-only reuse, Congruence Level (CL / CL^k / CL^plane), weakest-link, pathwise justification (PathId), TA/VA/LA lanes, no implicit averaging. *Queries:* "What is R in F–G–R?", "How does FPF propagate reliability?", "How do CL penalties route under transport?", "Bridge-only reuse of claims in FPF".
- **Builds on:** C.2, A.2.6, C.2.3, B.3, B.1.3, C.3, F.9. **Coordinates with:** G.6, G.7, E.14, E.18. **Constrains:** any cross-context claim reuse and any publication of `R_eff`.

#### C.2.3 Unified Formality Characteristic F
- **Status:** Stable
- *Keywords:* Formality, F-scale, F0-F9, rigor, proof, specification, formal methods. *Queries:* "What are the FPF formality levels?", "How to measure the rigor of a specification?".
- **Builds on:** C.2. **Constrains:** All patterns referencing F-G-R.

#### C.3 Kind‑CAL — Kinds, Intent/Extent, and Typed Reasoning
- **Status:** Stable
- *Keywords:* kind, type, intension, extension, subkind, typed reasoning, classification, vocabulary. *Queries:* "How does FPF handle types?", "What is a 'Kind'?", "Difference between 'scope' and 'type'?".
- **Builds on:** A.1, A.2.6 (USM). **Prerequisite for:** LOG-CAL, ADR-Kind-CAL, and any pattern needing typed guards.

#### C.3.1 `U.Kind` & `U.SubkindOf` (Core)
- **Status:** Stable
- *Keywords:* kind, subkind, partial order, type hierarchy. *Queries:* "What is U.Kind in FPF?", "How to model 'is-a' relationships?".
- **Builds on:** A.1, A.2.6 (USM). **Prerequisite for:** C.3.2, C.3.3.

#### C.3.2 `KindSignature` (+F) & `Extension`/`MemberOf`
- **Status:** Stable
- *Keywords:* KindSignature, intension, extension, MemberOf, Formality F, determinism. *Queries:* "How to define the meaning of a Kind?", "What is the difference between intent and extent in FPF?".
- **Builds on:** C.3.1. **Prerequisite for:** C.3.3, C.3.4.

#### C.3.3 `KindBridge` & `CL^k` — Cross‑context Mapping of Kinds
- **Status:** Stable
- *Keywords:* KindBridge, type-congruence, CL^k, cross-context mapping, R penalty. *Queries:* "How to map types between domains?", "What is a KindBridge?".
- **Builds on:** C.3.1, C.3.2, A.2.6, C.2.2.

#### C.3.4 `RoleMask` — Contextual Adaptation of Kinds (without cloning)
- **Status:** Stable
- *Keywords:* RoleMask, context-local adaptation, constraints, subkind promotion. *Queries:* "How to adapt a Kind for a local context?", "What is a RoleMask in FPF?".
- **Builds on:** C.3.1, C.3.2.

#### C.3.5 `KindAT` — Intentional Abstraction Facet for Kinds (K0…K3)
- **Status:** Stable
- *Keywords:* KindAT, abstraction tier, K0-K3, informative facet, planning. *Queries:* "What are the abstraction tiers for Kinds?", "How to plan formalization effort?".
- **Builds on:** C.3.1.

#### C.3.A Typed Guard Macros for Kinds + USM (Annex)
- **Status:** Stable
- *Keywords:* Typed guard, ESG, Method-Work, USM, Kind-CAL, regulatory profile. *Queries:* "How to write a typed guard?", "How do Kinds and USM interact in gates?".
- **Builds on:** All C.3.x, A.2.6.

#### C.4 Method‑CAL
- **Status:** Draft
- *Keywords:* method, recipe, procedure, workflow, SOP, MethodDescription, operator. *Queries:* "How to model a process or workflow?", "What is a MethodDescription in FPF?".
- **Builds on:** A.3, A.15. **Coordinates with:** Γ_method (B.1.5).

#### C.5 Resrc‑CAL
- **Status:** Draft
- *Keywords:* resource, energy, material, information, cost, budget, consumption, Γ_work. *Queries:* "How does FPF model resource usage?", "How to track costs of a process?".
- **Builds on:** A.15.1 (Work). **Coordinates with:** Sys-CAL.

#### C.6 LOG‑CAL – Core Logic Calculus
- **Status:** Draft
- *Keywords:* logic, inference, proof, modal logic, trust operators, reasoning. *Queries:* "What is the base logic of FPF?", "How does FPF handle formal proofs?".
- **Builds on:** Kind-CAL. **Is used by:** B.7.

#### C.7 CHR‑CAL – Characterisation Kit
- **Status:** Draft
- *Keywords:* characteristic, property, measurement, metric, quality. *Queries:* "How to define a new measurable property in FPF?", "What is a CHR pattern?".
- **Builds on:** A.17, A.18. **Prerequisite for:** Agency-CHR, Creativity-CHR.

#### Cluster C.II – Domain‑Specific Patterns

#### C.9 Agency‑CHR
- **Status:** Draft
- *Keywords:* agency, agent, autonomy, decision-making, active inference. *Queries:* "How to measure autonomy?", "What defines an agent in FPF?".
- **Builds on:** CHR-CAL, A.13.

#### C.10 Norm‑CAL
- **Status:** Draft
- *Keywords:* norm, constraint, ethics, obligation, permission, deontics. *Queries:* "How to model rules and constraints?", "Where are ethical principles defined in FPF?".
- **Builds on:** A.10. **Is used by:** Part D.

#### C.11 Decsn‑CAL
- **Status:** Draft
- *Keywords:* decision, choice, preference, utility, options. *Queries:* "How does FPF model decision-making?", "How to represent preferences and utility?".
- **Builds on:** A.13.

#### Cluster C.III – Meta‑Infrastructure CALs

#### C.12 ADR‑Kind-CAL
- **Status:** Draft
- *Keywords:* versioning, rationale, DRR, architecture decision record. *Queries:* "How are changes to kinds managed?".
- **Builds on:** Kind-CAL, E.9.

#### C.13 Compose‑CAL — Constructional Mereology
- **Status:** Stable
- *Keywords:* mereology, part-whole, composition, sum, set, slice, extensional identity. *Queries:* "How does FPF formally construct parts and wholes?", "What is Compose-CAL?".
- **Builds on:** A.14. **Is used by:** B.3.5 (CT2R-LOG).

#### Cluster C.IV – Composite & Macro‑Scale

#### C.14 M‑Sys‑CAL
- **Status:** Draft
- *Keywords:* system-of-systems, infrastructure, large-scale systems, orchestration. *Queries:* "How to model a complex infrastructure like a power grid?".
- **Builds on:** Sys-CAL, B.2.2.

#### C.15 M‑KD‑CAL
- **Status:** Draft
- *Keywords:* paradigm, scientific discipline, meta-analysis, knowledge ecosystem. *Queries:* "How to model an entire field of science?".
- **Builds on:** KD-CAL, B.2.3.

#### C.16 MM‑CHR — Measurement & Metrics Characterization
- **Status:** Stable
- *Keywords:* measurement, metric, unit, scale, CSLC, U.DHCMethodRef, U.Measure. *Queries:* "How are metrics defined in FPF?", "What is the CSLC discipline?".
- **Builds on:** A.17, A.18. **Is a prerequisite for:** All CHR patterns.

#### C.17 Creativity‑CHR — Characterising Generative Novelty & Value
- **Status:** Stable
- *Keywords:* creativity, novelty, value, surprise, innovation, ideation. *Queries:* "How does FPF measure creativity?", "What defines a novel idea?".
- **Builds on:** CHR-CAL, MM-CHR. **Coordinates with:** NQD-CAL, E/E-LOG.

#### C.18 NQD‑CAL — Open‑Ended Search Calculus
- **Status:** Stable
- *Keywords:* search, exploration, hypothesis generation, novelty, quality, diversity (NQD). *Queries:* "How does FPF support structured brainstorming?", "What is NQD search?".
- **Builds on:** KD-CAL. **Coordinates with:** B.5.2.1, Creativity-CHR, E/E-LOG.

#### C.18.1 SLL — Scaling‑Law Lens (binding)
- **Status:** Stable
- *Keywords:* scaling law, scale variables (S), compute‑elasticity, data‑elasticity, resolution‑elasticity, exponent class, knee, diminishing returns. *Queries:* "How to make search scale‑savvy?", "Where to declare scale variables and expected elasticities?"
- **Builds on:** C.16, C.17, C.18. **Coordinates with:** C.19, G.5, G.9, G.10.

#### C.19 E/E‑LOG — Explore–Exploit Governor
- **Status:** Stable
- *Keywords:* explore-exploit, policy, strategy, decision lens, portfolio management. *Queries:* "How to balance exploration and exploitation?", "What is an EmitterPolicy?".
- **Builds on:** Decsn-CAL. **Coordinates with:** NQD-CAL.

#### C.19.1 BLP — Bitter‑Lesson Preference (policy)
- **Status:** Stable
- *Keywords:* general‑method preference, iso‑scale parity, scale‑probe, deontic override. *Queries:* "What is the default policy when a domain‑specific trick competes with a scalable general method?"
- **Builds on:** C.19, C.24. **Coordinates with:** G.5, G.8, G.9, A.0.

#### C.20 Discipline‑CAL — Composition of `U.Discipline`
- **Status:** Stable
- *Keywords:* discipline, **U.AppliedDiscipline**, **U.Transdiscipline**, episteme corpus, standards, institutions, **Γ_disc**. *Queries:* "How to compose and assess a discipline in FPF?"
- **Builds on:** C.2 KD‑CAL, G.0, Part F (Bridges/UTS). **Coordinates with:** C.21, C.23.

#### C.21 Discipline‑CHR - Field Health & Structure
- **Status:** Stable
- *Keywords:* discipline, field health, reproducibility, standardisation, alignment, disruption. *Queries:* "How to measure the health of a scientific field?", "What is reproducibility rate?".
- **Builds on:** C.16, C.2, A.2.6, B.3. **Coordinates with:** C.20, G.2.

#### C.22 Problem‑CHR - Problem Typing & TaskSignature Binding
- **Status:** Stable
- Keywords: problem typing, TaskSignature, selector, eligibility, acceptance, CHR‑typed traits. Queries: "How does FPF type problems for selection?", "What is a TaskSignature?".
- **Builds on:** C.16, G.5, G.0. **Coordinates with:** G.4, C.23.

#### C.23 Method‑SoS‑LOG — MethodFamily Evidence & Maturity
- **Status:** Stable
- *Keywords:* MethodFamily, evidence, maturity, SoS-LOG, admit, degrade, abstain, selector. *Queries:* "How is method family maturity assessed?", "What is the SoS-LOG for selection?".
- **Builds on:** G.5, G.4, C.22, B.3.

#### C.24 C.Agent-Tools-CAL — Agentic Tool-Use & Call-Planning
- **Status:** Stable
- Keywords: agentic tools, call-planning, budget, BLP, SLL, policy-aware sequencing. Queries: "How to sequence tool calls?", "What is Agent-Tools-CAL?"
- **Builds on:** C.5, C.18, C.19, B.3. **Coordinates with:** G.5, G.9.

#### C.25 Q-Bundle — Structured Treatment of “-ilities” (Quality Families)
- **Status:** Stable
- Clarifies how to model common “-ilities” (availability, reliability, etc.) either as single measurable Characteristics or as composite bundles combining Measures [CHR] + Scope [USM] + Mechanism/Status slots.
- **Builds on:** A.2.6 (USM), A.6.1 (Mechanism), C.16 (MM-CHR)

## Part D – Multi-scale Ethics & Conflict-Optimisation


#### D.1

#### D.2

#### D.3

#### D.4

#### D.5

## Part E – The FPF Constitution and Authoring Guides


#### Cluster E.I — The FPF Constitution

#### E.1 Vision & Mission
- **Status:** Stable
- *Keywords:* vision, mission, operating system for thought, purpose, scope, goals, non-goals. *Queries:* "What is FPF?", "What is the purpose of the First Principles Framework?", "What problem does FPF solve?".
- **Prerequisite for:** All other patterns, especially E.2.

#### E.2 The Eleven Pillars
- **Status:** Stable
- *Keywords:* principles, constitution, pillars, invariants, core values, rules, P-1 to P-11. *Queries:* "What are the core principles of FPF?", "What are the eleven pillars?".
- **Builds on:** E.1. **Prerequisite for:** E.3 and all normative patterns.

#### E.3 Principle Taxonomy & Precedence Model
- **Status:** Stable
- *Keywords:* taxonomy, precedence, conflict resolution, hierarchy, principles, classification, Gov, Arch, Epist, Prag, Did. *Queries:* "How does FPF resolve conflicting principles?", "What is the hierarchy of FPF rules?".
- **Builds on:** E.2. **Constrains:** All patterns and DRRs.

#### E.4 FPF Artefact Architecture
- **Status:** Stable
- *Keywords:* artifact, families, architecture, conceptual core, tooling, pedagogy, canon, tutorial, linter. *Queries:* "How are FPF documents structured?", "What is the difference between the core spec and tooling?".
- **Builds on:** E.1. **Constrained by:** E.5.3.

#### E.5 Four Guard-Rails of FPF
- **Status:** Stable
- *Keywords:* guardrails, constraints, architecture, rules, safety, GR-1 to GR-4. *Queries:* "What are the main architectural constraints in FPF?".
- **Builds on:** E.2, E.3. **Prerequisite for:** E.5.1, E.5.2, E.5.3, E.5.4.

#### E.5.1 DevOps Lexical Firewall
- **Status:** Stable
- *Keywords:* lexical firewall, jargon, tool-agnostic, conceptual purity, DevOps, CI/CD, yaml. *Queries:* "Can I use terms like 'CI/CD' in FPF core patterns?".
- **Refines:** E.5. **Constrains:** All Core patterns.

#### E.5.2 Notational Independence
- **Status:** Stable
- *Keywords:* notation, syntax, semantics, tool-agnostic, diagram, UML, BPMN. *Queries:* "Does FPF require a specific diagram style?", "How is meaning defined in FPF?".
- **Refines:** E.5. **Constrains:** All Core patterns.

#### E.5.3 Unidirectional Dependency
- **Status:** Stable
- *Keywords:* dependency, layers, architecture, modularity, acyclic, Core, Tooling, Pedagogy. *Queries:* "What are the dependency rules between FPF artifact families?".
- **Refines:** E.5. **Constrains:** E.4.

#### E.5.4 Cross-Disciplinary Bias Audit
- **Status:** Stable
- *Keywords:* bias, audit, ethics, fairness, trans-disciplinary, neutrality, review. *Queries:* "How does FPF handle bias?", "Is there an ethics review process in FPF?".
- **Refines:** E.5. **Constrains:** All Core patterns. **Links to:** Part D.

#### Cluster E.II — The Author’s Handbook

#### E.6 Didactic Architecture of the Spec
- **Status:** Stable
- *Keywords:* didactic, pedagogy, structure, narrative flow, on-ramp, learning. *Queries:* "How is the FPF specification structured for learning?", "What is the 'On-Ramp first' principle?".
- **Builds on:** E.2 (P-2 Didactic Primacy).

#### E.7 Archetypal Grounding Principle
- **Status:** Stable
- *Keywords:* grounding, examples, archetypes, U.System, U.Episteme, Tell-Show-Show. *Queries:* "How are FPF patterns explained?", "What are the standard examples in FPF?".
- **Builds on:** E.6. **Constrains:** All architectural patterns.

#### E.8 FPF Authoring Conventions & Style Guide
- **Status:** Stable
- *Keywords:* authoring, style guide, conventions, template, S-rules, narrative flow. *Queries:* "How to write a new FPF pattern?", "What is the FPF style guide?".
- **Builds on:** E.6, E.7. **Constrains:** All new patterns.

#### E.9 Design-Rationale Record (DRR) Method
- **Status:** Stable
- *Keywords:* DRR, design rationale, change management, decision record, context, consequences. *Queries:* "How are changes to FPF managed?", "What is a DRR?".
- **Builds on:** E.2 (P-10 Open-Ended Evolution). **Constrains:** All normative changes.

#### E.10 LEX-BUNDLE: Unified Lexical Rules for FPF
- **Status:** Stable
- *Keywords:* lexical rules, naming, registers, rewrite rules, process, function, service. *Queries:* "What is the complete set of FPF naming rules?".
- **Builds on:** A.7, E.5, F.5. **Coordinates with:** A.2, A.10, A.15, B.1, B.3, Part F.

#### E.10.P Conceptual Prefixes (policy & registry)
- **Status:** Stable
- *Keywords:* prefixes, U., Γ_, ut:, tv:, namespace, registry. *Queries:* "What do the prefixes like 'U.' mean in FPF?".
- **Depends on:** E.9. **Constrains:** E.5.1, E.5.2.

#### E.10.D1 Lexical Discipline for “Context” (D.CTX)
- **Status:** Stable
- *Keywords:* context, U.BoundedContext, anchor, domain, frame. *Queries:* "What is the formal meaning of 'Context' in FPF?".
- **Builds on:** A.7, A.4. **Coordinates with:** F.1, F.2, F.3, F.7, F.9.

#### E.10.D2 Intension–Description–Specification Discipline (I/D/S)
- **Status:** Stable
- *Keywords:* intension, description, specification, I/D/S, testable, verifiable. *Queries:* "Difference between a description and a specification in FPF?".
- **Builds on:** A.7, E.10.D1, C.2.1, C.2.3. **Constrains:** F.4, F.5, F.8, F.9, F.15.

#### E.12 Didactic Primacy & Cognitive Ergonomics
- **Status:** Stable
- *Keywords:* didactic, cognitive load, ergonomics, usability, Rationale Mandate, HF-Loop. *Queries:* "How does FPF ensure it's understandable?", "What is the 'So What?' test in FPF?".
- **Builds on:** E.2 (P-2). **Complements:** E.13.

#### E.13 Pragmatic Utility & Value Alignment
- **Status:** Stable
- *Keywords:* pragmatic, utility, value, Goodhart's Law, Proxy-Audit Loop, MVE. *Queries:* "How does FPF ensure solutions are useful, not just correct?", "What is a Minimally Viable Example (MVE)?".
- **Builds on:** E.2 (P-7). **Complements:** E.12.

#### E.14 Human-Centric Working-Model
- **Status:** Stable
- *Keywords:* working model, human-centric, publication surface, grounding, assurance layers. *Queries:* "What is the main interface for FPF users?", "How does FPF separate human-readable models from formal assurance?".
- **Builds on:** E.7, E.8, C.2.3. **Coordinates with:** B.3.5, C.13, E.10.

#### E.15 Lexical Authoring & Evolution Protocol (LEX-AUTH)
- **Status:** stable
- *Keywords:* lexical authoring, evolution protocol, LAT, delta-classes. *Queries:* "How are FPF patterns authored and evolved?", "What is a Lexical Authoring Trace (LAT)?".
- **Builds on:** E.9, E.10, B.4, C.18, C.19, A.10, B.3, F.15.

#### E.16 RoC-Autonomy: Budget & Enforcement
- **Status:** Stable
- *Keywords:* autonomy, budget, guarded enactment, ledger, SoD, override, UTS
- *Queries:* "How is autonomy bounded and tested?", "How are overrides enforced under SoD?"

#### E.17.0 U.MultiViewDescribing — Viewpoints, Views & Correspondences
- **Status:** New
- Keywords: multi-view describing, viewpoint, view, entity-of-interest, description families, correspondence model, ISO 42010 alignment, view vs viewpoint, engineering vs publication viewpoints. Queries: “How to organise multiple descriptions of one object-of-talk?”, “How are viewpoints, views and correspondences structured in FPF?”, “How do viewpoint libraries generalise ISO 42010 for non-architectural descriptions?”
- Builds on: C.2.1 (U.EpistemeSlotGraph; DescribedEntity/Viewpoint/View slots), A.6.2 (U.EffectFreeEpistemicMorphing), A.6.3 (U.EpistemicViewing), A.6.4 (U.EpistemicRetargeting), A.7 (Strict Distinction; I/D/S vs Surface), E.10.D1 (Context), E.10.D2 (I/D/S discipline). Used by: E.17 (MVPK — publication as a specialisation of multi-view describing for morphisms), E.17.1 (U.ViewpointBundleLibrary), E.17.2 (TEVB), E.18:5.12 (E.TGA engineering viewpoint families), domain-specific description schemes (architecture, safety cases, governance, research).

#### E.17.1 U.ViewpointBundleLibrary — Reusable Viewpoint Bundles
- **Status:** Stable
- Keywords: viewpoint family, viewpoint library, ViewFamilyId, reusable bundles, engineering/management/research packs, ISO 42010 viewpoint libraries. Queries: “How to define reusable viewpoint bundles in FPF?”, “What is a Viewpoint library?”, “How do we reuse the same viewpoint family across EoIClasses and contexts?”
- Builds on: E.17.0 (U.MultiViewDescribing), C.2.1 (U.EpistemeSlotGraph; ViewpointSlot/ViewSlot), A.6.2–A.6.4 (episteme morphisms), A.7 (Strict Distinction; I/D/S vs Surface), E.7 (Archetypal Grounding), E.10/E.10.D1/D2 (LEX-BUNDLE & Context/I-D-S discipline). Used by: E.17.2 (TEVB — Typical Engineering Viewpoints Bundle), E.18:5.12 (E.TGA engineering viewpoint families), future domain-specific viewpoint packs (architecture, governance, safety, research).

#### E.17.2 TEVB — Typical Engineering Viewpoints Bundle
- **Status:** Stable
- Keywords: engineering viewpoints, holon, Functional/Procedural/Role-Enactor/Module-Interface views, EoIClass = U.Holon, ISO 42010 mapping, E.TGA bindings. Queries: “What are canonical engineering viewpoints over a holon?”, “How does TEVB relate to E.TGA and MVPK?”, “How do ISO 42010 architecture viewpoints map onto FPF engineering viewpoints?”
- Builds on: E.17.0 (U.MultiViewDescribing), E.17.1 (U.ViewpointBundleLibrary), C.2.1 (U.EpistemeSlotGraph; DescribedEntity/Viewpoint/View slots), A.1 (Holon; U.System/U.Episteme as typical EoI), A.6.2–A.6.4 (episteme morphisms), A.7/E.10.D2 (Strict Distinction & I/D/S discipline). Used by: E.18:5.12 (E.TGA engineering viewpoint families), E.17 (MVPK — publication of engineering morphisms via EngineeringVPId/PublicationVPId correspondences), engineering description/spec patterns and future ISO-aligned architecture description species.

#### E.17 Multi‑View Publication Kit (for Morphisms)
- **Status:** Stable
- Keywords: publication, U.View/U.EpistemeView, multi-view, viewpoints, PublicationScope (USM), PlainView/TechCard/InteropCard/AssuranceLane, functorial views, reindexing (PromoteView[s→t]), Publication characteristics (PC.Number, PC.EvidenceBinding, PC.ComparatorSetRef, PC.CharacteristicSpaceRef), CHR/UNM/CG-Spec anchoring, UTS, pin discipline, D/S→Surface (no I→D/D→S). Queries: “How to publish any morphism across Plain/Tech/Interop/Assurance views without changing semantics?”, “How do MVPK faces relate to U.View/U.EpistemeView and U.Viewpoint/PublicationVPId?”, “How to pin numeric claims and evidence lanes on publication faces so they stay functorial and audit-ready?”
- Builds on: A.7/E.10.D2 (Strict Distinction & I/D/S discipline; Surface orthogonality), A.6.2–A.6.3 (U.EffectFreeEpistemicMorphing, U.EpistemicViewing), C.2.1 (U.EpistemeSlotGraph; View/Viewpoint slots), E.17.0 (U.MultiViewDescribing), E.17.1 (U.ViewpointBundleLibrary), E.17.2 (TEVB), E.8 (Authoring conventions), E.10 (LEX-BUNDLE incl. L-SURF), Part F/G (UTS, CG-Spec, CHR pins, UNM). Used by / Coordinates with: E.18 (E.TGA — publication of morphisms via MVPK faces), Part G (SoTA pack shipping surfaces, EvidenceGraph views), tooling that emits human-readable cards/lanes over D/S-epistemes about morphisms.

#### E.18 Transduction Graph Architecture (E.TGA)
- **Status:** Stable
- *Keywords:* transduction graph, **nodes=morphisms**, **edge=U.Transfer** (single-edge kind), **OperationalGate(profile)**, **CV⇒GF** (ConstraintValidity → GateFit), **MVPK** faces, **SquareLaw**, **UNM single-writer**, **CSLC normalize-then-compare**, **Set-return selection**, **PathSlice/Sentinel refresh**, **DesignRunTag**. *Queries:* “What is E.TGA?”, “How do gates/bridges publish crossings?”, “How to model flows of morphisms?”
- **Builds on:** E.17 (MVPK), E.8, E.10, A.7. **Coordinates with:** A.20–A.26 (Flow/GateProfilization/Profiles/Sentinels), F.9 (Bridges & CL), G.11 (Refresh).

#### E.19 Pattern Quality Gates: Review & Refresh Profiles
- **Status:** New
- *Keywords:* pattern review, quality gates, admission, refresh, staleness, profile-based checks, PQG, PCP, SoTA-Echoing, conformance coherence. *Queries:* "How to review a new FPF pattern before admitting it?", "How to refresh stale patterns in FPF?", "What are PQG/PCP in FPF?"
- **Builds on:** E.8, E.10, E.9, E.15. **Coordinates with:** F.8 (Mint/Reuse), F.18 (Naming protocol), F.9 (Bridges & CL), F.15 (Harness), G.11 (Refresh). **Constrains:** Admission/refresh decisions for patterns intended for the canonical corpus.

## Part F — The Unification Suite (U‑Suite): Concept‑Sets, SenseCells & Contextual Role Assignment


#### F.0.1 Contextual Lexicon Principles
- **Status:** Stable
- *Keywords:* local meaning, context, semantic boundary, bridge, congruence, lexicon, U.BoundedContext. *Queries:* "How does FPF handle ambiguity?", "What is the principle of local meaning?", "How do different contexts communicate?".
- **Builds on:** A.1.1. **Prerequisite for:** All patterns in Part F.

#### Cluster F.I — context of meaning & Raw Material

#### F.1 Domain‑Family Landscape Survey
- **Status:** Stable
- Keywords: domain‑family survey, context map, canon, scope notes, versioning, authoritative source.
- **Builds on:** E.10.D1, F.0.1, A.7. **Prerequisite for:** F.2, F.3, F.4, F.9.

#### F.2 Term Harvesting & Normalisation
- **Status:** Stable
- *Keywords:* term harvesting, lexical unit, normalization, provenance, surface terms. *Queries:* "How to extract terminology from a standard?", "What is a local lexical unit?", "How to handle synonyms within one domain?".
- **Builds on:** F.1. **Prerequisite for:** F.3.

#### F.3 Intra‑Context Sense Clustering
- **Status:** Stable
- *Keywords:* sense clustering, disambiguation, Local-Sense, SenseCell, counter-examples. *Queries:* "How to group similar terms within a single domain?", "What is a SenseCell?", "How to handle words with multiple meanings in one context?".
- **Builds on:** F.2. **Prerequisite for:** F.4, F.7, F.9.

#### Cluster F.II — Concept-Sets & Role Assignment/Description (definition, naming, decision)

#### F.4 Role Description (RCS + RoleStateGraph + Checklists)
- **Status:** Stable
- *Keywords:* role template, status template, invariants, RoleStateGraph (RSG), Role Characterisation Space (RCS). *Queries:* "How to define a role in FPF?", "What is a Role Description?", "How to specify the states of a role?".
- **Builds on:** F.3, A.2.1. **Prerequisite for:** F.6, F.8.

#### F.5 Naming Discipline for U.Types & Roles
- **Status:** Stable
- *Keywords:* naming conventions, lexical rules, morphology, twin registers, U.Type naming. *Queries:* "What are the rules for naming roles in FPF?", "How to create clear and consistent names for concepts?".
- **Builds on:** F.4, E.10.

#### F.6 Role Assignment & Enactment Cycle (Six-Step)
- **Status:** Stable
- *Keywords:* role assignment, enactment, conceptual moves, asserting status. *Queries:* "What is the process for assigning a role?", "How is a role enacted in FPF?", "What are the six steps of role assignment?".
- **Builds on:** F.4, A.2.1, A.15.

#### F.7 Concept‑Set Table Construction
- **Status:** Stable
- *Keywords:* concept-set, table, row, columns, differences, comparisons. *Queries:* "How do I create a concept-set table?", "How do I compare concepts across contexts?".
- **Builds on:** F.3, F.9. **Coordinates with:** A.6.9. **Prerequisite for:** F.8.

#### F.8 Mint or Reuse? (U.Type vs Concept-Set vs Role Description vs Alias)
- **Status:** Stable
- *Keywords:* decision lattice, type explosion, reuse, minting new types, parsimony. *Queries:* "When should I create a new U.Type?", "How to avoid creating too many roles?", "Decision guide for new concepts.".
- **Builds on:** F.4, F.7.

#### Cluster F.III — Cross‑Context Alignment & Applied Bindings

#### F.9 Alignment & Bridge across Contexts
- **Status:** Stable
- *Keywords:* bridge, alignment, mapping, cross-context, CL, loss notes, direction. *Queries:* "How do I bridge concepts across contexts?", "How do I express alignment safely?".
- **Builds on:** F.3. **Coordinates with:** A.6.9. **Prerequisite for:** F.7, F.10.

#### F.10 Status Families Mapping (Evidence • Standard • Requirement)
- **Status:** Stable
- *Keywords:* status, evidence, standard, requirement, polarity, applicability windows. *Queries:* "How to map different types of status like 'evidence' and 'requirement'?", "How does FPF handle compliance?".
- **Builds on:** F.9, B.3.

#### F.11 Method Quartet Harmonisation
- **Status:** Stable
- *Keywords:* Method, MethodDescription, Work, Actuation, Role–Method–Work alignment. *Queries:* "How to align the concepts of 'method' and 'work' across domains?", "What is the method quartet?".
- **Builds on:** F.9, A.15.

#### F.12 Service Acceptance Binding
- **Status:** Stable
- *Keywords:* Service Level Objective (SLO), Service Level Agreement (SLA), acceptance criteria, binding, observation. *Queries:* "How to bind an SLO to actual work?", "How is service acceptance modeled in FPF?".
- **Builds on:** F.9, A.2.3, KD-CAL.

#### Cluster F.IV — Lexical Development Cycle, Growth Control, Tests & Examples

#### F.13 Lexical Continuity & Deprecation
- **Status:** Stable
- *Keywords:* evolution, deprecation, renaming, splitting terms, merging terms. *Queries:* "How to manage changes to terminology over time?", "What is the process for renaming a concept?".
- **Builds on:** F.5.

#### F.14 Anti‑Explosion Control (Roles & Statuses)
- **Status:** Stable
- *Keywords:* vocabulary growth, guard-rails, separation-of-duties, bundles, reuse. *Queries:* "How to prevent having too many roles and statuses?", "What are the strategies for controlling vocabulary size?".
- **Builds on:** F.4, F.8.

#### F.15 SCR/RSCR Harness for Unification
- **Status:** Stable
- *Keywords:* static checks, regression tests, acceptance tests, validation, SenseCell testing. *Queries:* "How is the unification process validated?", "What are SCR/RSCR tests in FPF?".
- **Builds on:** All of F.1-F.14.

#### F.16 Worked‑Example Template (Cross‑Domain)
- **Status:** Stable
- *Keywords:* didactic template, example, pedagogy, cross-domain illustration. *Queries:* "What is the standard format for a worked example in FPF?", "How to show a concept applied across different fields?".
- **Builds on:** All of F.1-F.12.

#### F.17 Unified Term Sheet (UTS)
- **Status:** Stable
- *Keywords:* Unified Term Sheet, UTS, summary table, glossary, publication, human-readable output. *Queries:* "What is the final output of the FPF unification process?", "Where can I find a summary of all unified terms?".
- **Builds on:** F.1-F.12.

#### F.18 Local-First Unification Naming Protocol
- **Status:** Stable
- *Keywords:* naming protocol, Name Card, local meaning, context-anchored naming. *Queries:* "What is the formal protocol for naming concepts?", "What is a Name Card in FPF?".
- **Builds on:** F.1-F.5.

## Part G – Discipline SoTA Patterns Kit


#### G.0 CG-Spec - Frame Standard & Comparability Governance
- **Status:** Stable
- *Keywords:* CG-Frame, governance, Standard, comparability, Comparability Governance, evidence, trust folding, Γ-fold, rules, policy. *Queries:* "How does FPF ensure metrics are comparable?", "What are the rules for comparing data across different models?", "What is a CG-Spec?".
- **Builds on:** B.3 (Trust), A.17-A.19 (MM-CHR), Part F (Bridges). **Prerequisite for:** G.1, G.2, G.3, G.4, G.5.

#### G.1 CG-Frame-Ready Generator
- **Status:** Stable
- *Keywords:* generator, SoTA, variant candidates, scaffold, F-suite, artifact creation, UTS, Role Description. *Queries:* "How to create new FPF artifacts for a domain?", "What is the process for extending FPF with a new theory?", "How does FPF generate candidate solutions?".
- **Builds on:** G.0, C.17 (Creativity-CHR), C.18 (NQD-CAL), C.19 (E/E-LOG). **Produces:** Artifacts for Part F.

#### G.2 SoTA Harvester & Synthesis
- **Status:** Stable
- *Keywords:* SoTA, harvester, synthesis, literature review, state-of-the-art, competing Traditions, triage, Bridge Matrix, Claim Sheets. *Queries:* "How does FPF incorporate existing research?", "How to model competing scientific theories?", "What is a SoTA Synthesis Pack?".
- **Builds on:** F.9 (Bridges). **Prerequisite for:** G.3, G.4.

#### G.3 CHR Authoring: Characteristics - Scales - Levels - Coordinates
- **Status:** Stable
- *Keywords:* CHR, authoring, characteristics, scales, levels, coordinates, CSLC, measurement, metrics, typing. *Queries:* "How do I define a new metric in FPF?", "What are the rules for creating characteristics?", "What is the CHR layer?".
- **Builds on:** G.2, A.17-A.19 (MM-CHR), C.16. **Prerequisite for:** G.4.

#### G.4 CAL Authoring: Calculi - Acceptance - Evidence
- **Status:** Stable
- *Keywords:* CAL, calculus, operators, acceptance clauses, evidence, logic, rules, predicates. *Queries:* "How to define new rules or logic in FPF?", "What is a CAL pattern in FPF?", "How to specify acceptance criteria for a method?".
- **Builds on:** G.3, B.3 (Trust). **Prerequisite for:** G.5.

#### G.5 Multi-Method Dispatcher & MethodFamily Registry
- **Status:** Stable
- *Keywords:* dispatcher, selector, method family, registry, No-Free-Lunch, policy, selection, multi-method. *Queries:* "How does FPF choose the right algorithm for a problem?", "What is the multi-method dispatcher?", "How to handle competing methods in FPF?".
- **Builds on:** G.2, G.3, G.4, C.19 (E/E-LOG).

#### G.6 Evidence Graph & Provenance Ledger
- **Status:** Stable
- *Keywords:* EvidenceGraph, provenance, path, anchor, lane, SCR, RSCR, PathId, PathSliceId. *Queries:* "How does FPF trace claims to evidence?", "What is an EvidenceGraph?", "How are evidence paths identified?".
- **Builds on:** A.10, B.3, G.4, F.9, C.23. **Prerequisite for:** G.5.

#### G.7 Cross-Tradition Bridge Matrix & CL Calibration
- **Status:** stub
- *Keywords:* Bridge Matrix, Tradition, Congruence Level (CL), CL^k, calibration, sentinel, loss notes, ReferencePlane. *Queries:* "How to compare competing scientific theories in FPF?", "What is a Bridge Matrix?", "How is Congruence Level calibrated?".
- **Builds on:** G.2, F.9, B.3, E.10, E.18. **Prerequisite for:** G.5.

#### G.8 SoS-LOG Bundles & Maturity Ladders
- **Status:** Stable
- *Keywords:* SoS-LOG, maturity ladder, admissibility ledger, selector, admit, degrade, abstain, portfolio, archive, dominance policy, illumination. *Queries:* "How to package SoS-LOG rules?", "What is a MethodFamily maturity ladder?", "How does the selector get its rules?".
- **Builds on:** C.23, G.4, G.6, G.5, C.22, C.18, C.19, F.9, G.7, E.18, E.10.

#### G.9 Parity / Benchmark Harness
- **Status:** Stable
- *Keywords:* parity, benchmark, harness, selector, portfolio, **iso-scale parity**, **scale-probe**, edition pins, freshness windows, comparator set, lawful orders, Pareto, Archive, ScoringMethods. *Queries:* "How to compare competing MethodFamilies?", "What is a parity run?", "How to ensure a fair **and scale-fair** benchmark in FPF?".
- **Builds on:** G.5, G.6, G.4, C.23, C.22, C.18/C.18.1/C.19/C.19.1, G.7, F.15, F.9, E.18, E.5.2.

#### G.10 SoTA Pack Shipping (Core Publication Surface)
- **Status:** Stable
- *Keywords:* SoTA-Pack, shipping surface, publication, parity pins, PathId, PathSliceId, telemetry, UTS, selector-ready. *Queries:* "What is the final output of the G-suite?", "How are SoTA packs published?", "What is a selector-ready portfolio?".
- **Builds on:** G.1–G.8, F.17–F.18, B.3, E.5.2, E.18, C.18/C.19/C.23.

#### G.11 Telemetry-Driven Refresh & Decay Orchestrator
- **Status:** Stable
- *Keywords:* telemetry, refresh, decay, PathSlice, Bridge Sentinels, edition-aware, epistemic debt, selector, portfolio. *Queries:* "How does FPF keep SoTA packs up-to-date?", "What triggers a model refresh?", "How is epistemic debt managed?".
- **Builds on:** G.6, G.7, G.5, G.8, G.10, C.18/C.19, C.23, B.3.4, E.18.

#### G.12 DHC Dashboards - Discipline-Health Time-Series (lawful telemetry, generation-first)
- **Status:** Stable
- *Keywords:* dashboard, discipline health, DHC, time-series, lawful telemetry, generation-first, selector, portfolio, Illumination. *Queries:* "How to measure the health of a discipline?", "What are DHC dashboards?", "How to create lawful time-series reports?".
- **Builds on:** C.21, G.2, G.5, G.6, G.8, G.10, G.11, C.18/C.19, C.23, F.17/F.18, E.5.2.

#### G.13 External Interop Hooks for SoTA Discipline Packs (conceptual)
- **Status:** INF
- *Keywords:* interop, external index, SoTA, mapper, telemetry, OpenAlex, ORKG, PRISMA, generation-first. *Queries:* "How does FPF integrate with external knowledge bases like OpenAlex?", "What is an InteropSurface?", "How to map external claims into FPF?".
- **Builds on:** G.2, G.5, G.6, G.7, G.8, G.9, G.10, G.11, G.12, C.21, C.23, E.5.2, E.18.

## Part H – Glossary & Definitional Pattern Index


#### H.1 Alphabetic Glossary
- **Status:** stub
- **Reminder:** Every `U.Type`, relation & operator with four‑register naming.

#### H.2 Definitional Pattern Catalogue
- **Status:** stub
- **Reminder:** One‑page micro‑stubs of every definitional pattern for quick lookup.

#### H.3 Cross‑Reference Maps
- **Status:** stub
- **Reminder:** Bidirectional links: Part A ↔ Part C ↔ Part B terms.

## Part I – Annexes & Extended Tutorials


#### I.1 Deprecated Aliases
- **Status:** stub
- **Reminder:** Legacy names kept for backward compatibility.

#### I.2 Detailed Walk‑throughs
- **Status:** stub
- **Reminder:** Step‑by‑step modelling of a pump + proof + dev‑ops pipeline.

#### I.3 Change‑Log (auto‑generated)
- **Status:** stub
- **Reminder:** Version history keyed to DRR ids.

#### I.4 External Standards Mappings
- **Status:** stub
- **Reminder:** Trace tables to ISO 15926, BORO, CCO, Constructor‑Theory terms.

## Part J – Indexes & Navigation Aids


#### J.1 Concept‑to‑Pattern Index
- **Status:** stub
- **Reminder:** Quick jump from idea (“boundary”) to pattern (§, id).

#### J.2 Pattern‑to‑Example Index
- **Status:** stub
- **Reminder:** Table listing every archetypal grounding vignette.

#### J.3 Principle‑Trace Index
- **Status:** stub
- **Reminder:** Maps each Pillar / C‑rule / P‑rule to concrete clauses.

## Part K - Lexical Debt


#### K.1 Mandatory Replacement of Measurement Terms
- **Status:** stub
- **Reminder:** Retires "axis/dimension" in favor of "Characteristic" and aligns other measurement terms.

#### K.2 Migration Debt from A.2.6 (USM)
- **Status:** stub
- **Reminder:** Specifies the required edits across the FPF to align with the new Unified Scope Mechanism (USM).