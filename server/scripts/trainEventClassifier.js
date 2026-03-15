/**
 * Event Classifier Training Script
 *
 * Trains the Bayesian classifier with a rich, domain-specific dataset
 * covering all categories used in the app:
 * Hackathon, Workshop, Seminar, Competition, Networking, Cultural,
 * Sports, Tech Talk, Career Fair, Education, Health, Entertainment, Social, Other
 *
 * Run: node server/scripts/trainEventClassifier.js
 */

const BayesianClassifier = require('../utils/bayesianClassifier');
const path = require('path');
const fs = require('fs');

// ── Training Data ─────────────────────────────────────────────────────────────
// 10+ samples per category for solid Naive Bayes priors
const trainingData = [

  // ── Hackathon ──────────────────────────────────────────────────────────────
  { text: '24-hour hackathon build innovative solutions coding challenge prizes cash internship', category: 'Hackathon' },
  { text: 'hackathon compete teams build app prototype judges mentors sponsors', category: 'Hackathon' },
  { text: '48-hour coding marathon hack build deploy win certificate cash prize', category: 'Hackathon' },
  { text: 'smart india hackathon problem statement government challenge innovation', category: 'Hackathon' },
  { text: 'AI hackathon machine learning challenge build model dataset compete', category: 'Hackathon' },
  { text: 'blockchain hackathon web3 decentralized app build deploy prize pool', category: 'Hackathon' },
  { text: 'open source hackathon contribute github pull request community prize', category: 'Hackathon' },
  { text: 'fintech hackathon payment solution banking innovation prize internship', category: 'Hackathon' },
  { text: 'health tech hackathon medical solution hospital problem statement', category: 'Hackathon' },
  { text: 'climate hackathon sustainability green tech environment challenge', category: 'Hackathon' },
  { text: 'game jam hackathon build game 48 hours unity unreal engine', category: 'Hackathon' },
  { text: 'design hackathon UI UX prototype figma challenge prize certificate', category: 'Hackathon' },

  // ── Workshop ───────────────────────────────────────────────────────────────
  { text: 'hands-on workshop learn skills practical session instructor guided', category: 'Workshop' },
  { text: 'coding workshop Python JavaScript beginners hands-on exercises', category: 'Workshop' },
  { text: 'design workshop Figma UI UX prototyping hands-on practice', category: 'Workshop' },
  { text: 'photography workshop lighting composition portrait techniques practice', category: 'Workshop' },
  { text: 'machine learning workshop scikit-learn tensorflow practical notebook', category: 'Workshop' },
  { text: 'public speaking workshop communication confidence presentation skills', category: 'Workshop' },
  { text: 'resume writing workshop career skills job application tips', category: 'Workshop' },
  { text: 'data analysis workshop Excel Power BI visualization hands-on', category: 'Workshop' },
  { text: 'robotics workshop Arduino sensors build circuit hands-on lab', category: 'Workshop' },
  { text: 'creative writing workshop storytelling fiction poetry techniques', category: 'Workshop' },
  { text: 'financial literacy workshop budgeting savings investment basics', category: 'Workshop' },
  { text: 'cybersecurity workshop ethical hacking CTF capture the flag lab', category: 'Workshop' },

  // ── Seminar ────────────────────────────────────────────────────────────────
  { text: 'seminar guest lecture industry expert talk knowledge sharing Q&A', category: 'Seminar' },
  { text: 'research seminar paper presentation academic findings discussion', category: 'Seminar' },
  { text: 'entrepreneurship seminar startup ecosystem funding venture capital', category: 'Seminar' },
  { text: 'mental health seminar awareness stress anxiety coping strategies', category: 'Seminar' },
  { text: 'technology seminar emerging trends AI blockchain IoT future', category: 'Seminar' },
  { text: 'legal seminar intellectual property rights patents trademarks', category: 'Seminar' },
  { text: 'climate change seminar sustainability environment policy discussion', category: 'Seminar' },
  { text: 'medical seminar healthcare advances treatment procedures doctors', category: 'Seminar' },
  { text: 'economics seminar market trends policy analysis discussion panel', category: 'Seminar' },
  { text: 'cybersecurity seminar threats data breach protection awareness', category: 'Seminar' },
  { text: 'leadership seminar management skills organizational behavior', category: 'Seminar' },
  { text: 'data science seminar big data analytics industry applications', category: 'Seminar' },

  // ── Competition ────────────────────────────────────────────────────────────
  { text: 'coding competition algorithm problem solving competitive programming prize', category: 'Competition' },
  { text: 'quiz competition general knowledge teams buzzer rounds prize', category: 'Competition' },
  { text: 'debate competition argument persuasion topics judges panel', category: 'Competition' },
  { text: 'business plan competition pitch startup idea judges investors prize', category: 'Competition' },
  { text: 'robotics competition autonomous bot obstacle course challenge', category: 'Competition' },
  { text: 'math olympiad competition problem solving prize certificate', category: 'Competition' },
  { text: 'science fair competition project display judges innovation award', category: 'Competition' },
  { text: 'case study competition business strategy analysis presentation', category: 'Competition' },
  { text: 'photography competition best shot theme judging prize certificate', category: 'Competition' },
  { text: 'essay writing competition topic submission judges prize scholarship', category: 'Competition' },
  { text: 'model united nations MUN debate resolution committee prize', category: 'Competition' },
  { text: 'treasure hunt competition clues teams campus challenge prize', category: 'Competition' },

  // ── Networking ─────────────────────────────────────────────────────────────
  { text: 'networking event professionals connect exchange contacts industry', category: 'Networking' },
  { text: 'alumni meetup reconnect graduates network career opportunities', category: 'Networking' },
  { text: 'startup networking founders investors mentors connect pitch', category: 'Networking' },
  { text: 'tech networking developers engineers connect community build', category: 'Networking' },
  { text: 'women in tech networking diversity inclusion connect support', category: 'Networking' },
  { text: 'industry mixer professionals socialize exchange business cards', category: 'Networking' },
  { text: 'speed networking meet professionals 5 minutes rotate connect', category: 'Networking' },
  { text: 'LinkedIn networking profile tips connections career growth', category: 'Networking' },
  { text: 'freelancer networking clients projects collaborate community', category: 'Networking' },
  { text: 'community networking local professionals collaborate grow', category: 'Networking' },
  { text: 'peer networking students connect study group collaborate', category: 'Networking' },
  { text: 'virtual networking online professionals zoom connect chat', category: 'Networking' },

  // ── Cultural ───────────────────────────────────────────────────────────────
  { text: 'cultural fest dance music drama traditional celebration heritage', category: 'Cultural' },
  { text: 'cultural exchange international students traditions food customs', category: 'Cultural' },
  { text: 'folk dance performance traditional music cultural heritage', category: 'Cultural' },
  { text: 'art exhibition cultural showcase paintings sculptures gallery', category: 'Cultural' },
  { text: 'food festival cultural cuisine traditions international flavors', category: 'Cultural' },
  { text: 'cultural night performances costumes traditions celebration', category: 'Cultural' },
  { text: 'language cultural event mother tongue celebration diversity', category: 'Cultural' },
  { text: 'theater drama cultural performance storytelling heritage', category: 'Cultural' },
  { text: 'music cultural festival classical folk fusion performance', category: 'Cultural' },
  { text: 'cultural awareness diversity inclusion celebration community', category: 'Cultural' },
  { text: 'ethnic cultural event traditional attire food music dance', category: 'Cultural' },
  { text: 'cultural symposium heritage preservation arts crafts traditions', category: 'Cultural' },

  // ── Sports ─────────────────────────────────────────────────────────────────
  { text: 'football tournament teams compete championship trophy prize', category: 'Sports' },
  { text: 'cricket match inter-college tournament teams compete', category: 'Sports' },
  { text: 'basketball tournament college teams compete championship', category: 'Sports' },
  { text: 'marathon run charity race fitness endurance certificate', category: 'Sports' },
  { text: 'yoga fitness wellness session health exercise mindfulness', category: 'Sports' },
  { text: 'swimming competition pool race championship prize', category: 'Sports' },
  { text: 'badminton tournament singles doubles championship prize', category: 'Sports' },
  { text: 'chess tournament strategy game competition prize certificate', category: 'Sports' },
  { text: 'athletics track field sprint relay jump throw competition', category: 'Sports' },
  { text: 'table tennis tournament singles doubles championship', category: 'Sports' },
  { text: 'esports gaming tournament online compete prize pool', category: 'Sports' },
  { text: 'kabaddi volleyball sports tournament inter-college compete', category: 'Sports' },

  // ── Tech Talk ──────────────────────────────────────────────────────────────
  { text: 'tech talk speaker engineer developer share experience insights', category: 'Tech Talk' },
  { text: 'lightning talk 5 minutes technology topic share community', category: 'Tech Talk' },
  { text: 'developer talk open source contribution community project', category: 'Tech Talk' },
  { text: 'AI talk large language models GPT applications future', category: 'Tech Talk' },
  { text: 'cloud talk AWS Azure GCP architecture best practices', category: 'Tech Talk' },
  { text: 'DevOps talk CI/CD pipeline deployment automation tools', category: 'Tech Talk' },
  { text: 'security talk vulnerability exploit patch responsible disclosure', category: 'Tech Talk' },
  { text: 'product talk roadmap features user feedback iteration', category: 'Tech Talk' },
  { text: 'engineering talk system design scalability architecture', category: 'Tech Talk' },
  { text: 'startup talk founder journey product market fit growth', category: 'Tech Talk' },
  { text: 'data talk analytics pipeline warehouse visualization insights', category: 'Tech Talk' },
  { text: 'mobile talk iOS Android React Native Flutter development', category: 'Tech Talk' },

  // ── Career Fair ────────────────────────────────────────────────────────────
  { text: 'career fair companies hiring recruiters students jobs internship', category: 'Career Fair' },
  { text: 'placement drive campus recruitment companies interview offer', category: 'Career Fair' },
  { text: 'job fair multiple companies booth resume submit interview', category: 'Career Fair' },
  { text: 'internship fair summer internship companies students apply', category: 'Career Fair' },
  { text: 'career expo industry professionals students connect jobs', category: 'Career Fair' },
  { text: 'recruitment drive company hiring freshers campus placement', category: 'Career Fair' },
  { text: 'career counseling guidance jobs resume interview preparation', category: 'Career Fair' },
  { text: 'industry connect companies students career opportunities', category: 'Career Fair' },
  { text: 'campus placement drive technical HR interview offer letter', category: 'Career Fair' },
  { text: 'career development fair skills jobs networking resume', category: 'Career Fair' },
  { text: 'graduate career fair postgraduate jobs PhD industry connect', category: 'Career Fair' },
  { text: 'startup career fair early stage companies hiring engineers', category: 'Career Fair' },

  // ── Education ──────────────────────────────────────────────────────────────
  { text: 'study skills exam preparation time management academic success', category: 'Education' },
  { text: 'online course certification learning platform skill development', category: 'Education' },
  { text: 'academic lecture professor knowledge sharing students', category: 'Education' },
  { text: 'tutoring session peer learning study group academic support', category: 'Education' },
  { text: 'scholarship awareness education funding application guidance', category: 'Education' },
  { text: 'STEM education science technology engineering math students', category: 'Education' },
  { text: 'language learning English communication skills practice', category: 'Education' },
  { text: 'educational bootcamp intensive learning program certificate', category: 'Education' },
  { text: 'teacher training pedagogy classroom management education', category: 'Education' },
  { text: 'e-learning digital education online platform students', category: 'Education' },

  // ── Health ─────────────────────────────────────────────────────────────────
  { text: 'health awareness wellness nutrition diet fitness lifestyle', category: 'Health' },
  { text: 'mental health counseling therapy stress anxiety support', category: 'Health' },
  { text: 'medical camp free checkup blood pressure diabetes screening', category: 'Health' },
  { text: 'yoga meditation mindfulness wellness retreat relaxation', category: 'Health' },
  { text: 'nutrition workshop healthy eating balanced diet meal plan', category: 'Health' },
  { text: 'first aid CPR training emergency response certification', category: 'Health' },
  { text: 'blood donation camp volunteer health community service', category: 'Health' },
  { text: 'fitness challenge workout gym health goals community', category: 'Health' },
  { text: 'mental wellness awareness depression anxiety coping skills', category: 'Health' },
  { text: 'healthcare innovation medical technology patient care', category: 'Health' },

  // ── Entertainment ──────────────────────────────────────────────────────────
  { text: 'comedy show stand-up comedian laughter entertainment fun', category: 'Entertainment' },
  { text: 'movie screening film watch popcorn entertainment social', category: 'Entertainment' },
  { text: 'music concert live band performance entertainment crowd', category: 'Entertainment' },
  { text: 'game night board games fun socialize entertainment friends', category: 'Entertainment' },
  { text: 'karaoke night singing fun entertainment social party', category: 'Entertainment' },
  { text: 'talent show performance singing dancing acting entertainment', category: 'Entertainment' },
  { text: 'open mic night poetry music comedy performance entertainment', category: 'Entertainment' },
  { text: 'DJ night party music dance entertainment social event', category: 'Entertainment' },
  { text: 'magic show illusion performance entertainment audience', category: 'Entertainment' },
  { text: 'escape room puzzle challenge fun entertainment team', category: 'Entertainment' },

  // ── Social ─────────────────────────────────────────────────────────────────
  { text: 'community volunteer social service charity help others', category: 'Social' },
  { text: 'book club reading discussion literature social community', category: 'Social' },
  { text: 'fundraising charity donation social cause community', category: 'Social' },
  { text: 'social gathering friends community connect celebrate', category: 'Social' },
  { text: 'awareness campaign social cause environment rights', category: 'Social' },
  { text: 'peer support group community mental wellness social', category: 'Social' },
  { text: 'cultural exchange social diversity inclusion community', category: 'Social' },
  { text: 'social impact project community development volunteer', category: 'Social' },
  { text: 'alumni social reunion reconnect friends memories', category: 'Social' },
  { text: 'celebration party social gathering friends community fun', category: 'Social' },

  // ── Other ──────────────────────────────────────────────────────────────────
  { text: 'general event miscellaneous gathering announcement', category: 'Other' },
  { text: 'orientation induction welcome new students campus tour', category: 'Other' },
  { text: 'annual day celebration awards ceremony recognition', category: 'Other' },
  { text: 'farewell event goodbye celebration memories friends', category: 'Other' },
  { text: 'exhibition showcase display products projects gallery', category: 'Other' },
];

// ── Classifier setup ──────────────────────────────────────────────────────────
// Override categories to match the app's actual category set
const APP_CATEGORIES = [
  'Hackathon', 'Workshop', 'Seminar', 'Competition', 'Networking',
  'Cultural', 'Sports', 'Tech Talk', 'Career Fair',
  'Education', 'Health', 'Entertainment', 'Social', 'Other',
];

const BayesianClassifierExtended = require('../utils/bayesianClassifier');

class AppEventClassifier extends BayesianClassifierExtended {
  constructor() {
    super();
    this.categories = APP_CATEGORIES;
    // Re-initialize data structures for the new category set
    this.categoryWordCounts = {};
    this.categoryDocumentCounts = {};
    this.wordCounts = {};
    this.totalDocuments = 0;
    this.categories.forEach((cat) => {
      this.categoryWordCounts[cat] = {};
      this.categoryDocumentCounts[cat] = 0;
    });
  }
}

const classifier = new AppEventClassifier();

console.log('Training event classifier...');
console.log(`Categories: ${APP_CATEGORIES.join(', ')}`);
console.log(`Total training samples: ${trainingData.length}\n`);

trainingData.forEach((sample) => {
  classifier.train(sample.text, sample.category);
});

console.log('Training complete.\n');

// ── Validation ────────────────────────────────────────────────────────────────
const testCases = [
  { text: '48-hour hackathon build AI app win cash prize internship', expected: 'Hackathon' },
  { text: 'hands-on Python coding workshop beginners practical exercises', expected: 'Workshop' },
  { text: 'guest lecture industry expert AI trends Q&A session', expected: 'Seminar' },
  { text: 'coding competition algorithm problem solving prize certificate', expected: 'Competition' },
  { text: 'professionals networking connect exchange contacts industry', expected: 'Networking' },
  { text: 'cultural fest dance music traditional heritage celebration', expected: 'Cultural' },
  { text: 'football cricket tournament inter-college championship prize', expected: 'Sports' },
  { text: 'developer talk open source cloud architecture insights', expected: 'Tech Talk' },
  { text: 'campus placement drive companies hiring freshers interview', expected: 'Career Fair' },
  { text: 'mental health awareness stress anxiety counseling support', expected: 'Health' },
  { text: 'comedy show live music entertainment fun social party', expected: 'Entertainment' },
  { text: 'community volunteer charity social cause fundraising', expected: 'Social' },
];

let correct = 0;
console.log('Validation results:');
testCases.forEach(({ text, expected }) => {
  const result = classifier.classify(text);
  const pass = result.category === expected;
  if (pass) correct++;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] "${text.slice(0, 50)}..."`);
  if (!pass) console.log(`         Expected: ${expected}, Got: ${result.category} (${(result.confidence * 100).toFixed(1)}%)`);
});
console.log(`\nAccuracy: ${correct}/${testCases.length} (${((correct / testCases.length) * 100).toFixed(1)}%)\n`);

// ── Save model ────────────────────────────────────────────────────────────────
const modelPath = path.join(__dirname, '..', 'data', 'eventClassifierModel.json');
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

classifier.saveModel(modelPath);
console.log(`Model saved to: ${modelPath}`);
console.log(`Total documents trained: ${classifier.totalDocuments}`);
