/**
 * The Learn section. The framework, rules and worked example come from the
 * project author's own notes; timings are a rough guide, not a rule.
 */
export type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'sub'; text: string }

export interface Section {
  id: string
  title: string
  blocks: Block[]
}

const p = (text: string): Block => ({ type: 'p', text })
const list = (...items: string[]): Block => ({ type: 'list', items })
const tip = (text: string): Block => ({ type: 'tip', text })
const sub = (text: string): Block => ({ type: 'sub', text })

export const SECTIONS: Section[] = [
  {
    id: 'what',
    title: 'What a whiteboard round is',
    blocks: [
      p('You are given an open design problem and about 45 minutes to work through it out loud, on a board, with an interviewer watching and answering questions. Nobody expects a finished product. They want to see how you think.'),
      sub('What interviewers look for'),
      list(
        'How well you explore the problem before solving it.',
        'Whether you can produce several different ideas instead of holding on to the first one.',
        'Your interaction design judgement and the trade-offs you make.',
        'How you collaborate: asking, listening and adjusting.',
        'How you manage the time.',
      ),
      tip('The solution matters less than the reasoning that led to it. Say your reasoning out loud.'),
    ],
  },
  {
    id: 'steps',
    title: 'The five steps at a glance',
    blocks: [
      p('Every problem can be worked through in the same order. The minutes are for a 45-minute session and are only a rough guide.'),
      list(
        'Understand (about 8 min): who exactly, why it matters to the business, platform, constraints.',
        'Scope (about 5 min): one user, one job, one context, written as a single sentence.',
        'Explore (about 12 min): the journey, where it hurts, two or three real directions, pick one.',
        'Solve (about 15 min): the flow, the key screens, the edge cases.',
        'Validate and wrap (about 5 min): summary, alternatives, first version, the metric.',
      ),
      tip('The session timer on the board follows these five steps. Treat it as a pace-keeper, not a rule.'),
    ],
  },
  {
    id: 'understand',
    title: '1. Understand',
    blocks: [
      p('Start by asking, not drawing. Write the answers on the board as you get them.'),
      list(
        'Who exactly is the user?',
        'What is the business goal, and why is this problem important?',
        'Which platform?',
        'What constraints, data or history should you know about?',
        'How will success be measured?',
        'Is this a new product or a change to an existing one?',
      ),
      sub('Business needs usually fall into five categories'),
      list('Revenue growth', 'Cost reduction', 'Retention and churn', 'Risk and compliance', 'Strategic positioning, such as a new market'),
      tip('Break the problem statement down word by word, and think from the point of view of every actor involved, not only the main user.'),
    ],
  },
  {
    id: 'scope',
    title: '2. Scope',
    blocks: [
      p('State the one user, one job and one context you are designing for. Then compress it into a single "How might we" sentence.'),
      tip('How might we help [a particular user] do [a key task] in [a scenario], so that they feel [the outcome]?'),
      p('Write it at the top of the board and do not change it. Everything after this is judged against that sentence, by you and by the interviewer.'),
    ],
  },
  {
    id: 'explore',
    title: '3. Explore',
    blocks: [
      list(
        'Sketch the journey from start to end.',
        'Mark where the pain is, and pick the moment that hurts most.',
        'From that moment, name what the design needs to do in two or three verbs, for example reassure, reduce anxiety, notify.',
        'Generate two or three real options that pull genuinely different levers, not different names for the same thing.',
        'Pick one. For each one you did not pick, say why in one sentence.',
      ),
      sub('Check your options against different causes'),
      p('To be sure your ideas really differ, ask why the user is not doing the thing today:'),
      list(
        'Awareness: they do not know about it.',
        'Friction: it is hard to do.',
        'Motivation: they do not want to.',
        'Trust: it feels risky or uncertain.',
        'Norms: it is not what people around them do.',
      ),
      sub('Keep a bag of idea directions'),
      p('When you are stuck, run through forms a solution could take: an interface, a wearable, a hybrid of physical and digital, a community, a marketplace, voice, camera, facial recognition, NFC, Bluetooth, AI.'),
      tip('A useful line: "I have a hunch already, but let me diagnose first so I don\'t just confirm my first instinct."'),
    ],
  },
  {
    id: 'solve',
    title: '4. Solve',
    blocks: [
      list(
        'List the key tasks the user must complete.',
        'Draw the flow from start to end.',
        'Wireframe only the key screens and name the key features on them.',
        'Reuse known conventions. Do not reinvent the wheel.',
      ),
      sub('Cover the edge cases'),
      list('Empty: nothing to show yet.', 'Error: something went wrong.', 'Offline: no connection.', 'First time: a user who has never been here.'),
    ],
  },
  {
    id: 'validate',
    title: '5. Validate and wrap',
    blocks: [
      list(
        'Summarise what you designed and for whom.',
        'Mention the alternatives you considered.',
        'Say how you would validate it: what you would test and how.',
        'Describe the smallest first version.',
        'Name the metric you would track.',
      ),
      tip('This is where you show business and product understanding. Mention the research you would want and the constraints you worked within.'),
    ],
  },
  {
    id: 'rules',
    title: 'Six rules that sharpen your answer',
    blocks: [
      list(
        'Pin the person, not the segment. The moment you are given a demographic, narrow it to one specific person.',
        'Pin the mechanism, not the goal word. Whenever you say a goal word, finish the sentence: "because it makes X cheaper, more likely or less risky".',
        'Diagnose the delta. If your person changed their behaviour, chase that specific change, not the general category.',
        'Stress-test your own divergence. Before presenting options, check them against the different causes: awareness, friction, trust, incentive.',
        'Ground every trigger in your person. After you design a mechanism, replay it for the exact person from rule one and check it would really work for them.',
        'Close the loop. Your final metric should directly measure the mechanism from rule two, for the person from rule one. Not a count of activity.',
      ),
    ],
  },
  {
    id: 'translate',
    title: 'From business need to design',
    blocks: [
      p('A business goal is not a design brief. Translate it in four steps:'),
      list(
        'The business need.',
        'The user behaviour that would actually move that number.',
        'The design lever that produces that behaviour.',
        'What you would measure to prove it happened.',
      ),
      tip('If you cannot name the behaviour, you are not ready to design yet. Go back and ask.'),
    ],
  },
  {
    id: 'room',
    title: 'In the room',
    blocks: [
      list(
        'Be friendly and confident.',
        'Always think out loud.',
        'Follow a structure, and say which step you are in.',
        'Keep the user in mind in every decision.',
        'Do not feel trapped. Ask for help if you need it.',
        'Collaborate: treat the interviewer as a teammate.',
        'Ask for a time check.',
      ),
      sub('Common mistakes'),
      list(
        'Drawing screens before understanding the problem.',
        'Designing for "everyone" instead of one person.',
        'Falling in love with the first idea.',
        'Working in silence.',
        'Running out of time before any solution is on the board.',
        'Ending with a metric that only counts activity, such as app opens.',
      ),
    ],
  },
  {
    id: 'example',
    title: 'Worked example: the office shuttle',
    blocks: [
      p('Problem: increase adoption of the company shuttle among office employees. The details below are one illustrative way through it.'),
      sub('Understand'),
      list(
        'Who: office employees is a segment. Narrow it: an employee aged 22 to 32 who used the shuttle and drifted away to cabs. That change is the delta to chase.',
        'Business goal: increase adoption. Finish the sentence: because every filled seat makes each commute cheaper for the company.',
        'Platform: mobile app. Constraints: fixed routes and fixed stop timings.',
      ),
      sub('Scope'),
      tip('How might we help an employee who switched to cabs get from home to the office by shuttle on a normal workday, and feel sure they will arrive on time?'),
      sub('Explore'),
      list(
        'Journey: decide how to commute, walk to the stop, wait, ride, arrive.',
        'Highest pain: waiting at the stop, not knowing if the shuttle is coming or if there is a seat. That is a trust problem, not an awareness one.',
        'Verbs: reassure, reduce anxiety, notify.',
        'Options: live location with a guaranteed seat (trust); one-tap repeat booking (friction); rewards for riding streaks (incentive).',
        'Pick the first. Repeat booking does not help someone who doubts the shuttle will show up; rewards do not fix the reason they left.',
      ),
      sub('Solve'),
      list(
        'Key screens: next shuttle with live arrival time, seat confirmed, a "leave now" notification.',
        'Edge cases: no shuttle today, location signal lost, ticket available offline, first-time user choosing a stop.',
      ),
      sub('Validate'),
      list(
        'Metric: the share of commute days taken by shuttle among employees who had switched to cabs. Not app opens.',
        'Test: pilot on one route and compare against the others.',
      ),
    ],
  },
  {
    id: 'habits',
    title: 'Practice habits',
    blocks: [
      list(
        'Go through apps you use and sketch their core wireframes. Thirty to forty-five minutes of quick sketching builds a library of patterns in your hand.',
        'Keep adding to your bag of idea directions.',
        'Practise out loud, with a timer.',
        'After each session, read the feedback and retry the same problem.',
      ),
      sub('How Wytboard scores you'),
      list(
        'Problem framing: Understand and Scope.',
        'User understanding: pinning the person and the journey.',
        'Prioritisation: choosing one direction and saying why not the others.',
        'Solution quality: flow, key screens, edge cases.',
        'Communication: thinking out loud and wrapping up clearly.',
      ),
    ],
  },
]

/** The short version shown on the board in practice mode. */
export const CHEAT_SHEET: { title: string; items: string[] }[] = [
  { title: 'Understand', items: ['Who exactly?', 'Business goal, and why it matters', 'Platform, constraints, metric'] },
  { title: 'Scope', items: ['One user, one job, one context', 'Write the "How might we" and fix it'] },
  { title: 'Explore', items: ['Journey, then the worst pain moment', '2–3 options on different levers', 'Pick one; say why not the others'] },
  { title: 'Solve', items: ['Key tasks, flow, key screens', 'Reuse conventions', 'Empty, error, offline, first time'] },
  { title: 'Validate', items: ['Summarise, alternatives, first version', 'Metric that measures the mechanism'] },
  { title: 'Why not today?', items: ['Awareness', 'Friction', 'Motivation', 'Trust', 'Norms'] },
]
