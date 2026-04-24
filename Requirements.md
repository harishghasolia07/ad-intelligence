Brandora: Competitive Ad Intelligence Challenge
Objective
Over 5-6 hours, build a lightweight app that demonstrates your ability to retrieve, analyze, and reason over real-world ad data using the Meta Ad Library. The goal is not just to display ads, but to show how you structure and analyze multimodal ad data (copy + visuals) and use it to power a conversational AI layer that generates grounded, brand-specific creative recommendations.

Note on Data Access
The Meta Ad Library website at facebook.com/ads/library is publicly accessible with no login required. However, the official Meta Ad Library API has significant limitations for D2C commercial ads (it mainly works for political ads and EU/UK markets) and requires a lengthy app setup + identity verification process.
Don't waste time setting up the official API. Use a third-party approach: scraping tools like Apify, Puppeteer/Playwright, or any scraper wrapper that fits your workflow. Pick whatever gets you real ad data fastest and document your choice.

Tasks
1. Brand Setup
Accept a brand name and website URL as input.
Scrape and analyze the website to build a brand profile covering product/category, positioning, tone of voice, target audience, key value propositions, and visual style.
Persist the brand profile and display it in the app. This profile provides context for Task 3.
2. Competitor Ad Library
Accept 2-3 competitor brand names as input.
Fetch the 5-10 most recent image and carousel ads per competitor from the Meta Ad Library (skip video/reels).
Display the ads in a browsable UI, with creative and copy visible side by side, organized by competitor.
Analyze each ad using AI, covering both the copy and the visual creative:
Copy: hook/opening line, CTA, messaging angle (pain point, aspiration, social proof, offer, urgency, etc.)
Visual: run images through a vision model to extract visual style (minimal, bold, lifestyle, product-shot, before/after), people vs no people, text overlay, UGC-looking vs produced, product visibility
Ad-level: format (single image vs carousel), overall creative category
Display the AI-generated analysis alongside each ad in the UI.
How you structure and store this analyzed data is a core part of the assignment. It directly affects the quality of Task 3.
3. Creative Intelligence Chat
Build a chat interface where the user can ask questions about the competitive landscape and get creative recommendations for their brand.
Example queries:
"What creative angles would work best for my brand?"
"What hooks are my competitors overusing?"
"Give me 3 ad concepts none of my competitors are running"
"What visual styles are dominating in this space?"
"Write me ad copy and describe the creative for a carousel ad"
Responses must be grounded in the brand profile (Task 1) and the analyzed competitor ads (Task 2), not generic.
The ad data for 2-3 competitors fits in context. Don't over-engineer with RAG or vector search. Focus on how well you prepare and structure the data before it reaches the LLM.

Constraints
Support multiple brands. The user should be able to add a new brand (with its own set of competitors) and switch between them. Keep the data model simple.
5-10 most recent image/carousel ads per competitor. Don't paginate through hundreds of ads.
Data should persist across page refreshes. Fetching ads and running vision analysis is expensive, it shouldn't be lost on reload. You may use SQLite, a JSON file, localStorage, or any persistence layer. Communicate your reasoning for the chosen method and the tradeoffs you considered (e.g., simplicity vs queryability, client-side vs server-side, structured vs unstructured storage).
Real data only. Fetch real ads, scrape real websites. No dummy or hardcoded data.


Guidelines
Document your choices when deciding between architectural approaches: persistence method, how you structured the ad data schema, which vision/LLM model you used and why, how you prepare context for the chat. Explain the tradeoffs.
Vibe coding is fine. Use AI tools, Copilot, whatever lets you do your best work. But you need to understand and explain every architectural decision. We will ask.
Don't over-engineer. No async queues, no microservices. Simple and synchronous.
Pick your stack. Whatever you're fastest with. (prefer: python, next.js, react)
Include a Loom video (5-10 min) walking through your approach, schema decisions, how the data flows from Task 2 to Task 3, and what you'd improve with more time.
Host your code in a public GitHub repo with a clean README and setup steps.

What We're Evaluating
Ad analysis & structuring
How did you analyze the ads, both copy and visuals? Is the data structured in a way that makes chat responses useful?
Visual understanding
Did you analyze the images, or only the text?
Architectural reasoning
Can you explain your persistence choice, schema design, and context preparation? Did you consider tradeoffs?
Chat quality
Are responses grounded in real ad data and tailored to the brand, or generic?
Problem breakdown
How did you approach this? What did you build first and why?
Tradeoffs & scoping
Did you make smart decisions within the time constraint?
