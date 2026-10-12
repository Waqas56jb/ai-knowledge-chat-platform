/* Static UI configuration only: brand copy, labels and option lists. No user or workspace data lives here. */
export const BRAND = { name: 'DTS AI', short: 'DTS', tagline: 'Expert answers for building a medical supply resale business.' };

/* Source scopes accepted by POST /chat and the group filter of GET /sources. */
export const SCOPES = [['all', 'All sources'], ['youtube', 'YouTube'], ['document', 'Documents'], ['text', 'Text'], ['conversation', 'Conversations']];

/* Display metadata for the four source groups the API reports (Source.group). */
export const TYPES = {
  youtube: { label: 'YouTube', plural: 'YouTube videos', icon: 'play-circle' },
  document: { label: 'Document', plural: 'Documents', icon: 'file-text' },
  text: { label: 'Text', plural: 'Text resources', icon: 'align-left' },
  conversation: { label: 'Conversation', plural: 'Client conversations', icon: 'messages-square' }
};
/* Source.type → group, mirroring the server's mapping (used for citations, which carry only the type). */
export const TYPE_GROUP = { youtube: 'youtube', pdf: 'document', docx: 'document', txt: 'text', markdown: 'text', business_knowledge: 'text', client_conversation: 'conversation' };
export const TYPE_LABEL = { youtube: 'YouTube video', pdf: 'PDF', docx: 'DOCX', txt: 'Text file', markdown: 'Markdown', business_knowledge: 'Business knowledge', client_conversation: 'Client conversation' };
export const groupOf = s => (s && (s.group || TYPE_GROUP[s.type] || TYPE_GROUP[s.sourceType])) || 'text';

export const TZ = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney'];
export const LANGS = ['English', 'Arabic', 'French', 'German', 'Spanish', 'Urdu'];
export const ROLE_LABEL = { admin: 'Admin', member: 'Member', readonly: 'Read-only' };

/* Landing + auth photography (Unsplash, full width). Every URL here was checked to return HTTP 200 image/jpeg. */
export const UNSPLASH = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=3840&q=90`;
export const LP_IMG = {
  hero: UNSPLASH('1553413077-190dd305871c'),        // warehouse aisle, shelves of boxed stock
  glucose: UNSPLASH('1593491205049-7f032d28cf5c'),   // glucose meter, lancing device and test strip tubs
  pharmacy: UNSPLASH('1576602976047-174e57a47881'),  // bright retail pharmacy interior
  starter: UNSPLASH('1556740758-90de374c12ad'),      // small business owner at a counter with a tablet
  scaling: UNSPLASH('1556761175-b413da4baf72'),      // growing team in an open office
  sourcing: UNSPLASH('1580674285054-bed31e145f59'),  // stacked cartons ready to sort
  negotiation: UNSPLASH('1521791136064-7986c2920216'), // business handshake
  leads: UNSPLASH('1460925895917-afdab827c52f'),     // analytics dashboard on a laptop
  team: UNSPLASH('1552664730-d307ca884978'),         // team planning session at a whiteboard
  funding: UNSPLASH('1450101499163-c8848c66ca85'),   // signing business paperwork
  scale: UNSPLASH('1586528116311-ad8dd3c8310d'),     // large fulfilment warehouse
  ask: UNSPLASH('1519389950473-47ba0277781c'),       // founders working at laptops, top-down
  answer: UNSPLASH('1517245386807-bb43f82c33c4'),    // discussion over a laptop
  moment: UNSPLASH('1556761175-5973dc0f32e7'),       // expert presenting to a room
  band: UNSPLASH('1565891741441-64926e441838'),      // aerial view of a distribution centre
  showcase: UNSPLASH('1551288049-bebda4e38f71'),     // dark analytics screen
  access: UNSPLASH('1566576721346-d4a3b4eaeb55'),    // sealed parcel handed over
  cta: UNSPLASH('1494412574643-ff11b0a5c1c3')        // container port from above
};
export const LP_HERO = LP_IMG.hero;
