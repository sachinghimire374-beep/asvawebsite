import type { SettingsValues } from './schemas/settings.js';

/**
 * Initial content for every settings group. Values come from the company brief; anything the
 * company has not supplied (address, phone, email, social profiles) is left empty and the
 * public site simply hides it until it is configured in Admin → Settings.
 */
export const DEFAULT_SETTINGS: SettingsValues = {
  general: {
    companyName: 'Asva Innovation Lab Pvt. Ltd.',
    shortName: 'Asva Innovation Lab',
    tagline: 'Software engineering studio in Pokhara, Nepal',
    description:
      'Asva Innovation Lab is a software development and IT solutions company based in Pokhara, Nepal, building custom software, web and mobile applications for businesses in Nepal and abroad.',
    positioning:
      'Asva Innovation Lab helps businesses transform ideas into powerful digital products through innovative software engineering, modern web technologies, and customized IT solutions.',
    city: 'Pokhara',
    country: 'Nepal',
  },
  branding: {
    logoForDarkBgId: null,
    logoForLightBgId: null,
    logoIconId: null,
    faviconId: null,
    ogImageId: null,
    primaryColor: '#2563EB',
    accentColor: '#2563EB',
  },
  contact: {
    email: null,
    phone: null,
    whatsapp: null,
    addressLine: null,
    city: 'Pokhara',
    country: 'Nepal',
    mapEmbedUrl: null,
    businessHours: [],
  },
  social: { links: [] },
  seo: {
    defaultTitle: 'Asva Innovation Lab — Software Development Company in Pokhara, Nepal',
    titleTemplate: '%s | Asva Innovation Lab',
    defaultDescription:
      'Custom software, web and mobile app development from Pokhara, Nepal. Asva Innovation Lab builds reliable digital products for businesses in Nepal and worldwide.',
    searchConsoleVerification: null,
  },
  analytics: { enabled: false, ga4MeasurementId: null, gtmContainerId: null },
  cookies: {
    bannerEnabled: true,
    message:
      'We use essential cookies to run this website. With your permission we would also like to use analytics cookies to understand how the site is used.',
    policyHref: '/cookie-policy',
  },
  maintenance: {
    enabled: false,
    message: 'We are making some improvements and will be back shortly. Thank you for your patience.',
  },
  home: {
    hero: {
      eyebrow: 'ASVA INNOVATION LAB · POKHARA, NEPAL',
      headline: 'We build software that moves businesses forward.',
      subheadline:
        'From business applications to custom digital products, we help organizations solve real problems through thoughtful design and reliable engineering.',
      primaryCta: { label: 'Discuss a project', href: '/start-a-project' },
      secondaryCta: { label: 'Our services', href: '/services' },
      imageId: null,
    },
    intro: {
      eyebrow: 'About',
      heading: 'A software company in Pokhara, working with businesses in Nepal and abroad.',
      body:
        'Asva Innovation Lab is a software development and IT solutions company based in Pokhara, Nepal. We work with startups, growing businesses and established organisations to solve real operational problems, streamline the way teams work, and turn ideas into dependable digital products — from the first requirement workshop through launch and long-term support.',
      cta: { label: 'Learn more about us', href: '/about' },
    },
    services: {
      heading: 'What we do',
      subheading: 'We design, build and maintain software that fits the way your organization works.',
      limit: 6,
    },
    whyChooseUs: {
      enabled: true,
      heading: 'How we approach the work',
      subheading: 'The fundamentals that make software projects succeed.',
      items: [
        { title: 'Client-focused development', description: 'We start from your goals and users, and keep you involved in every decision that matters.', icon: 'Users' },
        { title: 'Customised solutions', description: 'Software shaped around your processes rather than forcing your team into a template.', icon: 'Puzzle' },
        { title: 'Modern engineering practices', description: 'Version control, code review, automated testing and repeatable deployments as standard.', icon: 'GitBranch' },
        { title: 'Transparent communication', description: 'Clear scopes, regular demos and honest progress updates — no surprises.', icon: 'MessagesSquare' },
        { title: 'Maintainable architecture', description: 'Clean, documented code that your team or ours can extend with confidence.', icon: 'Layers' },
        { title: 'Long-term technical support', description: 'Monitoring, updates and continuous improvement after launch.', icon: 'LifeBuoy' },
      ],
    },
    process: {
      enabled: true,
      heading: 'How we work',
      subheading: 'A clear, collaborative lifecycle from first conversation to continuous improvement.',
      steps: [
        { title: 'Discovery & Requirement Analysis', description: 'We learn your business, users and constraints.' },
        { title: 'Planning & Architecture', description: 'Scope, milestones and an architecture that can grow.' },
        { title: 'UI/UX Design', description: 'Interfaces validated with you before we build.' },
        { title: 'Development', description: 'Iterative builds with regular demos.' },
        { title: 'Testing & Quality Assurance', description: 'Automated and manual testing across devices.' },
        { title: 'Deployment', description: 'Secure, repeatable releases with monitoring.' },
        { title: 'Maintenance & Continuous Improvement', description: 'Support and enhancements based on real usage.' },
      ],
    },
    technologies: {
      enabled: true,
      heading: 'Technology',
      subheading: 'Well-supported tools, chosen for each project’s needs.',
    },
    testimonials: {
      heading: 'What our clients say',
      subheading: null,
    },
    cta: {
      heading: 'Have a project in mind? Let’s talk.',
      body: 'Tell us about the problem you are trying to solve. We will reply within two business days.',
      button: { label: 'Discuss a project', href: '/start-a-project' },
    },
  },
  about: {
    heading: 'Engineering digital products from Pokhara, Nepal',
    intro:
      'Asva Innovation Lab Pvt. Ltd. is a software development and IT solutions company based in Pokhara, Nepal. We help businesses, startups and organisations turn ideas into reliable digital products through custom software engineering, modern web technologies and tailored IT solutions.',
    mission:
      'To help organisations solve real problems with thoughtfully engineered software — delivered transparently, built to last and supported for the long term.',
    vision:
      'To be a trusted technology partner for businesses in Nepal and around the world, known for craftsmanship, reliability and genuine client partnership.',
    values: [
      { title: 'Craftsmanship', description: 'We care about the quality of what we build, down to the details users never see.', icon: 'Gem' },
      { title: 'Integrity', description: 'Honest estimates, clear communication and commitments we keep.', icon: 'ShieldCheck' },
      { title: 'Partnership', description: 'Your success is how we measure ours.', icon: 'Handshake' },
      { title: 'Continuous learning', description: 'We keep improving our skills, tools and processes.', icon: 'Lightbulb' },
    ],
    approachHeading: 'Our approach to software development',
    approach:
      'Every engagement starts with understanding the problem, not the technology. We define clear goals, design with users, build in short iterations with regular demos, and automate testing and deployment so releases are predictable. After launch we stay involved — monitoring, maintaining and improving the product as your business evolves.',
    showTeam: true,
    timeline: [],
  },
  footer: {
    description:
      'Software development and IT solutions company in Pokhara, Nepal — building custom software, web and mobile applications for businesses in Nepal and worldwide.',
    newsletterEnabled: true,
    newsletterHeading: 'Stay in the loop',
    newsletterBody: 'Occasional insights on software and technology. No spam — unsubscribe anytime.',
    copyrightName: 'Asva Innovation Lab Pvt. Ltd.',
  },
  careers: {
    intro:
      'We are building a team of thoughtful engineers and designers in Pokhara. If you enjoy solving real problems with well-crafted software, we would like to hear from you.',
    acceptGeneralApplications: true,
    noVacanciesMessage:
      'There are no open vacancies right now. You are welcome to send a general application and we will be in touch when a suitable role opens.',
  },
  notifications: {
    leadRecipients: [],
    contactRecipients: [],
    careersRecipients: [],
    sendSubmitterConfirmations: true,
  },
};
