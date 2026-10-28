/**
 * @file guides.ts
 * @description The short "how to use this page" guides shown the first time
 * someone opens a screen after signing in.
 *
 * The rule is three steps at most, one sentence each. People skip long tours,
 * so a guide says what the page is for and the one next thing to do, and the
 * rest is discoverable. `Steps` is a tuple type so a fourth step won't compile.
 *
 * Add a guide by adding an entry; `id` is what "already seen" is remembered
 * against, so renaming one shows it again.
 */

export interface GuideStep {
  title: string;
  body: string;
  /** An optional shortcut to the thing the step talks about. */
  action?: { label: string; to: string };
}

type Steps = [GuideStep] | [GuideStep, GuideStep] | [GuideStep, GuideStep, GuideStep];

export interface Guide {
  id: string;
  steps: Steps;
}

const YOUR_NAME: GuideStep = {
  title: 'Your name, top right',
  body: 'Press your name for your profile and Sign out. On a phone, it is the round picture at the top.',
};

/** Keyed by the page's path. */
const GUIDES: Record<string, Guide> = {
  '/staff/dashboard': {
    id: 'staff-dashboard',
    steps: [
      {
        title: 'This is your church at a glance',
        body: 'The tiles show people, giving and attendance. "Needs attention" lists what to do first.',
      },
      {
        title: 'Start by adding your people',
        body: 'A name is enough to begin. You can fill in the rest later.',
        action: { label: 'Add a person', to: '/staff/members/add' },
      },
      { ...YOUR_NAME, body: 'Everything else is in the side menu (the ☰ button on a phone). Your name has your profile and Sign out.' },
    ],
  },
  '/board/dashboard': {
    id: 'board-dashboard',
    steps: [
      {
        title: 'Your network in one view',
        body: 'This compares the churches you oversee, so you can see which ones need help.',
      },
      {
        title: 'Shape the structure',
        body: 'Add and arrange the districts and churches under you.',
        action: { label: 'Open structure', to: '/board/hierarchy' },
      },
    ],
  },
  '/platform/dashboard': {
    id: 'platform-dashboard',
    steps: [
      {
        title: 'The health of the platform',
        body: 'System status and the most recent admin actions are here. Check this first each day.',
      },
      {
        title: 'Churches live under Organisations',
        body: 'Open one to see its plan, switch features on or off, or help with a problem.',
        action: { label: 'Open organisations', to: '/platform/orgs' },
      },
    ],
  },
  '/portal': {
    id: 'portal-home',
    steps: [
      {
        title: 'Welcome home',
        body: 'Your church’s news and what is coming up are on this page.',
      },
      {
        title: 'Give from your phone',
        body: 'Gifts you make are recorded here, and you can see your giving history.',
        action: { label: 'Open giving', to: '/portal/giving' },
      },
      { title: 'Find your way around', body: 'The bar at the bottom jumps between Home, Giving, Events, Groups and Alerts. Your picture, top right, has your profile and Sign out.' },
    ],
  },

  '/staff/members': {
    id: 'staff-members',
    steps: [
      {
        title: 'Everyone in your church',
        body: 'Type a name, phone, email or group in the search box to find someone. Tap a person to open them.',
      },
      {
        title: 'New people',
        body: 'Add a member or a visitor. A name alone is enough.',
        action: { label: 'Add a person', to: '/staff/members/add' },
      },
    ],
  },
  '/staff/events': {
    id: 'staff-events',
    steps: [
      {
        title: 'Services and gatherings',
        body: 'Upcoming and past gatherings are listed by tab. Search by title or place.',
      },
      {
        title: 'Taking the register',
        body: 'On the day, open Take attendance to tick off who came.',
        action: { label: 'Take attendance', to: '/staff/attendance/take' },
      },
    ],
  },
  '/staff/attendance/take': {
    id: 'staff-attendance',
    steps: [
      {
        title: 'Tick who is here',
        body: 'Choose the gathering, then tap each person who came. "Mark all visible" ticks everyone shown.',
      },
    ],
  },
  '/staff/finance': {
    id: 'staff-finance',
    steps: [
      {
        title: 'Giving at a glance',
        body: 'Totals for the period and what is still waiting on you.',
      },
      {
        title: 'Count the offering',
        body: 'Each Sunday’s offering goes into a batch that is reviewed, then closed.',
        action: { label: 'Open offering batches', to: '/staff/finance/batches' },
      },
    ],
  },
  '/portal/giving': {
    id: 'portal-giving',
    steps: [
      {
        title: 'Your giving',
        body: 'Give here, and see everything you have given. Your statements for the year are kept too.',
      },
    ],
  },
};

export function guideFor(pathname: string): Guide | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return GUIDES[path];
}
