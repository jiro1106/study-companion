import type { Seed } from './types'

export const sampleSeed: Seed = {
  today: {
    userName: 'Jiro',
    goalMinutes: 30,
    minutesToday: 18,
    streakDays: 14,
    weekDone: [true, true, true, false, false, false, false],
    todayIndex: 3,
    recallPercent: 86
  },
  decks: [
    {
      id: 'deck-bio',
      title: 'Cell Biology',
      subjectCode: 'Bi',
      tone: 'brand',
      sourceDocumentId: 'doc-bio',
      sourceName: 'BIO 101 Lecture 6.pdf',
      cardCount: 48,
      dueCount: 12,
      mastery: 0.72,
      status: 'due'
    },
    {
      id: 'deck-chem',
      title: 'Organic Chemistry: Reactions',
      subjectCode: 'Ch',
      tone: 'link',
      sourceDocumentId: 'doc-chem',
      sourceName: 'Ch 7 Substitution Reactions.pdf',
      cardCount: 36,
      dueCount: 0,
      mastery: 0.41,
      status: 'struggling'
    },
    {
      id: 'deck-hist',
      title: 'Philippine History 1898–1946',
      subjectCode: 'Hi',
      tone: 'warning',
      sourceDocumentId: 'doc-hist',
      sourceName: 'HIST 12 Reader.pdf',
      cardCount: 22,
      dueCount: 0,
      mastery: 0.95,
      status: 'mastered'
    }
  ],
  cards: [
    { id: 'c1', deckId: 'deck-bio', term: 'Chemiosmosis', definition: 'ATP production driven by protons flowing back across the inner mitochondrial membrane through ATP synthase.', sourcePage: 14 },
    { id: 'c2', deckId: 'deck-bio', term: 'Glycolysis', definition: 'Splits one glucose into two pyruvate in the cytoplasm, netting 2 ATP and 2 NADH. Needs no oxygen.', sourcePage: 8 },
    { id: 'c3', deckId: 'deck-bio', term: 'Fermentation', definition: 'Regenerates NAD⁺ without oxygen so glycolysis can continue. Yields only 2 ATP per glucose.', sourcePage: 19 },
    { id: 'c4', deckId: 'deck-bio', term: 'Krebs cycle', definition: 'Oxidizes acetyl-CoA in the mitochondrial matrix, producing NADH, FADH₂, CO₂ and 2 ATP per glucose.', sourcePage: 11 },
    { id: 'c5', deckId: 'deck-chem', term: 'SN2 reaction', definition: 'One-step substitution where the nucleophile attacks as the leaving group leaves, inverting the stereocenter.', sourcePage: 6 },
    { id: 'c6', deckId: 'deck-chem', term: 'Leaving group', definition: 'The atom or group that departs with the bonding electrons; weak bases such as I⁻ and Br⁻ leave best.', sourcePage: 4 },
    { id: 'c7', deckId: 'deck-hist', term: 'Treaty of Paris (1898)', definition: 'Ended the Spanish–American War; Spain ceded the Philippines to the United States for $20 million.', sourcePage: 3 },
    { id: 'c8', deckId: 'deck-hist', term: 'Tydings–McDuffie Act', definition: 'The 1934 US law that set up the Commonwealth and promised Philippine independence after ten years.', sourcePage: 41 }
  ],
  documents: [
    {
      id: 'doc-bio',
      fileName: 'BIO 101 Lecture 6 — Cellular Respiration.pdf',
      title: 'Cellular Respiration',
      pageCount: 24,
      cardCount: 48,
      processing: null,
      summary: {
        readMinutes: 2,
        keyIdeas: [
          { text: 'Cellular respiration turns glucose and oxygen into ATP, CO₂ and water.', page: 3 },
          { text: 'It runs in three stages: glycolysis in the cytoplasm, the Krebs cycle in the mitochondrial matrix, and the electron transport chain on the inner membrane.', page: 5 },
          { text: 'Glycolysis nets 2 ATP and 2 NADH per glucose and needs no oxygen.', page: 8 },
          { text: 'The electron transport chain makes about 34 of the roughly 38 ATP, using a proton gradient that drives ATP synthase.', page: 14 },
          { text: 'Without oxygen, cells fall back on fermentation, which regenerates NAD⁺ but yields only 2 ATP.', page: 19 }
        ],
        examTerms: ['ATP synthase', 'Chemiosmosis', 'Pyruvate', 'NADH', 'Oxidative phosphorylation', 'Fermentation'],
        excerpt: {
          page: 14,
          heading: '6.4 The Electron Transport Chain',
          paragraphs: [
            'The final stage of cellular respiration takes place on the inner mitochondrial membrane. NADH and FADH₂ deliver high-energy electrons to a series of protein complexes. As electrons pass along the chain, energy is used to pump protons (H⁺) into the intermembrane space.',
            'The resulting proton gradient drives ATP synthase, producing approximately 34 ATP per glucose molecule. This process is called chemiosmosis. Oxygen serves as the final electron acceptor, combining with electrons and protons to form water.',
            'If oxygen is unavailable, the chain backs up and stops, and NADH can no longer be recycled to NAD⁺.'
          ],
          highlight: 'The resulting proton gradient drives ATP synthase, producing approximately 34 ATP per glucose molecule.'
        }
      }
    },
    {
      id: 'doc-chem',
      fileName: 'Ch 7 Substitution Reactions.pdf',
      title: 'Substitution Reactions',
      pageCount: 31,
      cardCount: 36,
      processing: null,
      summary: {
        readMinutes: 3,
        keyIdeas: [
          { text: 'Substitution swaps a leaving group for a nucleophile on an sp³ carbon.', page: 2 },
          { text: 'SN2 happens in one step with inversion; SN1 goes through a carbocation and gives a mix of products.', page: 6 }
        ],
        examTerms: ['SN1', 'SN2', 'Nucleophile', 'Leaving group', 'Carbocation'],
        excerpt: {
          page: 6,
          heading: '7.3 The SN2 Mechanism',
          paragraphs: ['In an SN2 reaction the nucleophile attacks the carbon from the side opposite the leaving group. Bond forming and bond breaking happen at the same time, so the reaction is a single step.'],
          highlight: 'Bond forming and bond breaking happen at the same time'
        }
      }
    },
    {
      id: 'doc-hist',
      fileName: 'HIST 12 Reader — American Period.pdf',
      title: 'The American Period',
      pageCount: 58,
      cardCount: 22,
      processing: null,
      summary: {
        readMinutes: 4,
        keyIdeas: [
          { text: 'The Treaty of Paris (1898) transferred the Philippines from Spain to the United States.', page: 3 },
          { text: 'The 1935 Commonwealth was a ten-year transition to independence under the Tydings–McDuffie Act.', page: 41 }
        ],
        examTerms: ['Treaty of Paris', 'Commonwealth', 'Tydings–McDuffie Act', 'Jones Law'],
        excerpt: {
          page: 41,
          heading: 'The Road to the Commonwealth',
          paragraphs: ['The Tydings–McDuffie Act of 1934 provided for a constitutional convention and a ten-year Commonwealth period, after which full independence would be granted.'],
          highlight: 'a ten-year Commonwealth period'
        }
      }
    }
  ],
  quiz: [
    { id: 'q1', documentId: 'doc-bio', prompt: 'Where does the electron transport chain take place?', options: ['Cytoplasm', 'Mitochondrial matrix', 'Inner mitochondrial membrane', 'Outer mitochondrial membrane'], correctIndex: 2, explanation: 'The chain sits on the inner membrane.', sourcePage: 14 },
    { id: 'q2', documentId: 'doc-bio', prompt: 'Which organelle makes most of a cell’s ATP?', options: ['Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'], correctIndex: 1, explanation: 'Mitochondria run cellular respiration.', sourcePage: 3 },
    { id: 'q3', documentId: 'doc-bio', prompt: 'How much ATP does glycolysis net per glucose?', options: ['2 ATP', '4 ATP', '34 ATP', '38 ATP'], correctIndex: 0, explanation: 'Glycolysis nets 2 ATP and 2 NADH.', sourcePage: 8 },
    { id: 'q4', documentId: 'doc-chem', prompt: 'What happens to the stereocenter in an SN2 reaction?', options: ['It is kept', 'It is inverted', 'It becomes a racemic mix', 'It is destroyed'], correctIndex: 1, explanation: 'Backside attack inverts the stereocenter.', sourcePage: 6 }
  ],
  chats: {
    'doc-bio': [
      { id: 'm-seed-1', role: 'user', text: 'Why does the electron transport chain stop without oxygen?', citedPages: [] },
      { id: 'm-seed-2', role: 'assistant', text: 'Oxygen is the last stop for electrons in the chain. With no oxygen to accept them, electrons back up, the proton pumps stop, and ATP synthase has no gradient to use. That’s why cells switch to fermentation, which only makes 2 ATP.', citedPages: [14, 19] }
    ]
  },
  exams: [
    { id: 'e1', title: 'BIO 101 Midterm', date: '2026-10-21', linkedDecks: 3 },
    { id: 'e2', title: 'CHEM 23 Quiz 3', date: '2026-10-28', linkedDecks: 1 }
  ]
}
