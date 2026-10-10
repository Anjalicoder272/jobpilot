"""
A dictionary of common tech skills and the different ways people write them.
Used to find skills in resumes and job descriptions without any AI.
"""
import re

# canonical name -> regex alternatives (matched as whole words, case-insensitive)
SKILLS = {
    # Frontend
    "JavaScript": [r"javascript", r"(?<![.\w])js\b", r"es6\+?", r"ecmascript"],
    "TypeScript": [r"typescript", r"(?<![.\w])ts\b"],
    "React": [r"react(\.?js)?(?!\s*native)"],
    "Next.js": [r"next\.?js", r"\bnext\b(?=.{0,20}(ssr|ssg|app router|react))"],
    "Redux": [r"redux"],
    "React Native": [r"react[\s-]native"],
    "Angular": [r"angular(js)?"],
    "Vue": [r"vue(\.?js)?"],
    "HTML": [r"html5?"],
    "CSS": [r"css3?"],
    "SCSS/Sass": [r"s[ac]ss"],
    "Tailwind CSS": [r"tailwind"],
    "Material UI": [r"material[\s-]?ui", r"\bmui\b"],
    "Responsive design": [r"responsive"],
    "Accessibility": [r"accessibility", r"\ba11y\b", r"wcag"],
    "Web performance": [r"core web vitals", r"web vitals", r"\blcp\b", r"lighthouse", r"page speed"],
    "SSR": [r"\bssr\b", r"server[\s-]side rendering"],
    "Webpack/Vite": [r"webpack", r"\bvite\b"],
    "Jest": [r"\bjest\b"],
    "Testing Library": [r"testing library", r"\brtl\b"],
    "Cypress/Playwright": [r"cypress", r"playwright"],
    "GraphQL": [r"graphql"],
    "WebSockets": [r"web\s?sockets?", r"socket\.io"],
    "Figma": [r"figma"],
    # Backend
    "Node.js": [r"node(\.?js)?\b"],
    "Express": [r"express(\.?js)?"],
    "NestJS": [r"nest\.?js"],
    "Python": [r"python"],
    "Django": [r"django"],
    "FastAPI": [r"fastapi"],
    "Flask": [r"flask"],
    "Java": [r"\bjava\b(?!\s*script)"],
    "Spring Boot": [r"spring\s?boot"],
    "Go": [r"\bgolang\b", r"\bgo\b(?=\s*(lang|developer|services|backend))"],
    "PHP": [r"\bphp\b"],
    "C/C++": [r"\bc\+\+", r"\bc/c\+\+"],
    "REST APIs": [r"rest(ful)?\s*apis?", r"\brest\b"],
    "Microservices": [r"micro[\s-]?services?"],
    "Authentication": [r"\bjwt\b", r"oauth", r"authentication", r"\bhmac\b"],
    # Data
    "SQL": [r"\bsql\b"],
    "PostgreSQL": [r"postgres(ql)?"],
    "MySQL": [r"mysql"],
    "MongoDB": [r"mongo(db)?"],
    "Redis": [r"redis"],
    "Kafka": [r"kafka"],
    # Cloud & tools
    "AWS": [r"\baws\b", r"amazon web services", r"\bec2\b", r"\bs3\b", r"lambda"],
    "GCP": [r"\bgcp\b", r"google cloud"],
    "Azure": [r"azure"],
    "Docker": [r"docker"],
    "Kubernetes": [r"kubernetes", r"\bk8s\b"],
    "CI/CD": [r"ci/cd", r"\bci\b", r"jenkins", r"github actions"],
    "Git": [r"\bgit\b", r"github", r"bitbucket"],
    "Linux": [r"linux"],
    # AI
    "LLMs": [r"\bllms?\b", r"large language models?", r"gpt", r"claude", r"gemini", r"openai"],
    "RAG": [r"\brag\b", r"retrieval[\s-]augmented"],
    "AI agents": [r"ai agents?", r"agentic", r"langchain", r"langgraph"],
    "Machine learning": [r"machine learning", r"\bml\b", r"pytorch", r"tensorflow"],
    # Fundamentals
    "Data structures & algorithms": [r"\bdsa\b", r"data structures", r"algorithms"],
    "System design": [r"system design"],
}

_PATTERNS = {name: re.compile("|".join(f"(?:{a})" for a in alts), re.IGNORECASE) for name, alts in SKILLS.items()}


def extract_skills(text: str) -> list[str]:
    """Return the canonical skills mentioned in the text, in dictionary order."""
    if not text:
        return []
    return [name for name, pattern in _PATTERNS.items() if pattern.search(text)]
