/**
 * Imports the content of the original static index.html into the database.
 *
 * Safe to re-run: every write is an upsert keyed on a stable slug, so seeding
 * an already-populated database refreshes the baseline content without
 * duplicating it. Records you later create in the admin panel are untouched.
 */
import "dotenv/config";
import { PrismaClient, type SectionType } from "@prisma/client";

const prisma = new PrismaClient();

const IMG = (name: string) => `/images/${name}`;

async function seedSettings() {
  const data = {
    siteTitle: "THE YONATAN TIMES",
    siteSubtitle: "PROFESSIONAL DEVELOPER'S CHRONICLE",
    volumeLabel: "Vol. 2025, No. 001",
    editionLabel: "PORTFOLIO EDITION",
    datelineText: "October 2025 | Ethiopia",

    authorName: "Yonatan Berihun",
    authorSubtitle: "Aspiring Inspired Developer | Lifelong Learner",
    aboutParagraphs: [
      "Hello! I'm Yonatan Berihun, a passionate and resilient aspiring developer currently in my third year of Information Systems at Hawassa University. My journey into technology began with a challenging introduction to C++, but that initial struggle ignited a relentless drive in me.",
      "Instead of being discouraged, I dedicated myself to mastering the craft, quickly expanding my skills to include C, C#, Python, Dart, and Java. This experience taught me to be a persistent, teachable, and lifelong learner who thrives on overcoming obstacles.",
      "Today, I am a relentless problem-solver, driven to build innovative solutions and continuously learn. I don't just write code; I embrace challenges and remain persistent until I achieve my goals.",
    ],
    portraitUrl: IMG("lo.png"),
    portraitAlt: "A portrait of Yonatan Berihun",

    cvTitle: "Professional Credentials",
    cvSubtitle: "Access my comprehensive resume and professional background",
    cvUrl: "https://docs.google.com/uc?export=download&id=1l1_uRZqzpk5jG1eeR3TuTUm5MeR97KwVitbgbqA2Z9o",
    cvEnabled: true,

    contactIntro:
      "Interested in collaboration, opportunities, or just want to connect? I'd love to hear from you. Feel free to reach out using the form below.",

    footerAbout:
      "The Yonatan Times is a digitally-native publication inspired by classic newspaper design. Every element showcases the elegance and sophistication achievable through careful typography and thoughtful layout.",
    copyright: "© 2025 The Yonatan Times. All Rights Reserved.",

    metaTitle: "The Yonatan Times | Professional Developer's Chronicle",
    metaDescription:
      "Yonatan Berihun's professional portfolio showcasing innovative projects, technical skills, and academic achievements in a newspaper-style design.",
    ogImageUrl: IMG("lo.png"),
  };

  await prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  console.info("  settings");
}

async function seedSocialLinks() {
  const links = [
    { platform: "github", label: "GitHub", url: "https://github.com/Yoni-Berihun" },
    { platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/yoni-berihun" },
    { platform: "x", label: "X (Twitter)", url: "https://x.com/yoni_berihun" },
    { platform: "telegram", label: "Telegram", url: "https://t.me/yoni_xyz" },
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/yoni_berihun" },
  ];

  for (const [index, link] of links.entries()) {
    const existing = await prisma.socialLink.findFirst({ where: { platform: link.platform } });
    if (existing) {
      await prisma.socialLink.update({ where: { id: existing.id }, data: { ...link, order: index } });
    } else {
      await prisma.socialLink.create({ data: { ...link, order: index } });
    }
  }
  console.info("  social links");
}

async function upsertSection(input: {
  slug: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  order: number;
}) {
  return prisma.section.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle ?? null,
      order: input.order,
    },
    update: { type: input.type, title: input.title, subtitle: input.subtitle ?? null, order: input.order },
  });
}

async function seedCtaSections() {
  const cv = await upsertSection({
    slug: "credentials",
    type: "CTA",
    title: "Professional Credentials",
    order: 0,
  });
  await prisma.callToAction.upsert({
    where: { sectionId: cv.id },
    create: {
      sectionId: cv.id,
      heading: "Professional Credentials",
      subheading: "Access my comprehensive resume and professional background",
      buttonLabel: "Download CV",
      buttonUrl:
        "https://docs.google.com/uc?export=download&id=1l1_uRZqzpk5jG1eeR3TuTUm5MeR97KwVitbgbqA2Z9o",
      icon: "download",
      decoration: "📄",
    },
    update: {},
  });

  const gh = await upsertSection({
    slug: "more-projects",
    type: "CTA",
    title: "Explore More Projects",
    order: 2,
  });
  await prisma.callToAction.upsert({
    where: { sectionId: gh.id },
    create: {
      sectionId: gh.id,
      heading: "Explore More Projects",
      subheading: "Discover additional repositories and my coding adventures on GitHub",
      buttonLabel: "More on GitHub",
      buttonUrl: "https://github.com/Yoni-Berihun",
      icon: "github",
      decoration: "💻",
    },
    update: {},
  });

  console.info("  call-to-action banners");
}

async function seedProjects() {
  const section = await upsertSection({
    slug: "projects",
    type: "PROJECTS",
    title: "From The Technology Desk",
    order: 1,
  });

  const projects = [
    {
      title: "Hawassa University Feedback Bot",
      category: "Telegram Bot",
      description:
        "A dynamic Telegram bot designed to streamline student feedback. Supports multiple languages and intelligently routes reports.",
      techTags: ["Python", "Telegram API", "Regex"],
      imageUrl: IMG("project-1.jpg"),
      imageAlt: "Hawassa University Feedback Bot screenshot",
      linkUrl: "https://t.me/official_HUSC_bot",
      linkLabel: "View Live Demo",
      isArchived: false,
      featured: true,
    },
    {
      title: "Daycare Management System",
      category: "Console Application",
      description:
        "A C++ console app to manage child records, allowing admins to add, view, search, and update profiles. Features persistent data storage.",
      techTags: ["C++", "File I/O", "Windows API"],
      imageUrl: IMG("daycare_management_system.png"),
      imageAlt: "Daycare Management System screenshot",
      linkUrl:
        "https://github.com/Yoni-Berihun/hawassa-university-daycare-management-system.git",
      linkLabel: "Archived",
      isArchived: true,
      featured: false,
    },
    {
      title: "YO Vehicle Rental System",
      category: "Console Application",
      description:
        "Engineered a Java-based console application to streamline vehicle rental operations, managing locations, vehicles, and customers.",
      techTags: ["Java", "OOP", "Java Enums"],
      imageUrl: IMG("vehicle_rental_system.png"),
      imageAlt: "YO Vehicle Rental System screenshot",
      linkUrl: "https://github.com/Yoni-Berihun/vehicle-rental-system.git",
      linkLabel: "Archived",
      isArchived: true,
      featured: false,
    },
    {
      title: "YO-Social Platform",
      category: "Console Application",
      description:
        "A Java console-based social media platform to connect users through posts, likes, and comments, with registration and authentication.",
      techTags: ["Java", "OOP", "Console I/O"],
      imageUrl: IMG("yo_social.png"),
      imageAlt: "YO-Social Platform screenshot",
      linkUrl: "https://github.com/Yoni-Berihun/YO-Social-Media-Platform.git",
      linkLabel: "Archived",
      isArchived: true,
      featured: false,
    },
    {
      title: "YO Dice Roller",
      category: "Console Application",
      description:
        "A lively Python app bringing the thrill of rolling dice to the terminal. Features ASCII art, animations, and session statistics.",
      techTags: ["Python", "random", "time"],
      imageUrl: IMG("yo_dice_roller.png"),
      imageAlt: "YO Dice Roller screenshot",
      linkUrl: "https://github.com/Yoni-Berihun/Dice-Rolling-Game.git",
      linkLabel: "Archived",
      isArchived: true,
      featured: false,
    },
    {
      title: "FaithMap",
      category: "Mobile Application",
      description:
        "FaithMap is a Flutter-powered app that helps users discover and navigate to Christian churches across Ethiopia. With service schedules, navigation, and community features, it connects believers and fosters unity in faith through technology and love.",
      techTags: ["Flutter", "Flutter Map", "Native Splash"],
      imageUrl: IMG("faithmap.png"),
      imageAlt: "FaithMap mobile application",
      linkUrl:
        "https://drive.google.com/uc?export=download&id=1GHAAG79NCEQIWH8SsRWV7ItIZeNsqJB7",
      linkLabel: "Download for Android",
      isArchived: false,
      featured: true,
    },
  ];

  for (const [index, project] of projects.entries()) {
    const existing = await prisma.project.findFirst({
      where: { sectionId: section.id, title: project.title },
    });
    if (existing) {
      await prisma.project.update({ where: { id: existing.id }, data: { ...project, order: index } });
    } else {
      await prisma.project.create({ data: { ...project, sectionId: section.id, order: index } });
    }
  }
  console.info(`  ${projects.length} projects`);
}

async function seedSkills() {
  const section = await upsertSection({
    slug: "skills",
    type: "SKILLS",
    title: "The Technology Dispatch",
    subtitle: "A Comprehensive Analysis of Core Competencies",
    order: 3,
  });

  const categories = [
    {
      title: "Programming Languages",
      items: [
        {
          heading: "C# and C++",
          description:
            "are my core programming languages. I've been working with them for system-level development and object-oriented design. I'm building everything from console applications to complex software architectures.",
        },
        {
          heading: "Python",
          description:
            "is my go-to language for automation and API development. I'm currently working on Telegram bots and building various utility applications that solve real problems.",
        },
        {
          heading: "Java",
          description:
            "is where I've developed my strongest OOP skills. I'm working with design patterns and building projects that range from console applications to full-stack solutions.",
        },
        {
          heading: "Dart and HTML/CSS",
          description:
            "are my tools for front-end development. I'm learning cross-platform mobile development with Flutter and building responsive web designs using modern standards.",
        },
      ],
    },
    {
      title: "Frameworks & Concepts",
      items: [
        {
          heading: "Object-Oriented Programming",
          description:
            "is my strongest foundation. I've been practicing encapsulation, inheritance, polymorphism, and SOLID principles across all my projects and languages.",
        },
        {
          heading: ".NET MVC",
          description:
            "is my first step into web frameworks. I'm learning the Model-View-Controller pattern and exploring the ASP.NET ecosystem for web development.",
        },
        {
          heading: "Flutter",
          description:
            "is my entry point into mobile development. I'm building cross-platform apps and learning Dart-based UI development and mobile architecture.",
        },
      ],
    },
    {
      title: "Developer Tools",
      items: [
        {
          heading: "Git and GitHub",
          description:
            "are my daily tools for version control. I'm managing repositories, collaborating on projects, and learning best practices for team development.",
        },
        {
          heading: "Python Telegram Bot API",
          description:
            "is my specialty area. I'm building bots with natural language processing, designing user interactions, and integrating various APIs for real-world applications.",
        },
        {
          heading: "Development Environments",
          description:
            "are my workspace. I'm working with various IDEs, debugging tools, and setting up development workflows across Windows and cross-platform scenarios.",
        },
      ],
    },
  ];

  for (const [index, category] of categories.entries()) {
    let record = await prisma.skillCategory.findFirst({
      where: { sectionId: section.id, title: category.title },
    });

    record ??= await prisma.skillCategory.create({
      data: { sectionId: section.id, title: category.title, order: index },
    });

    await prisma.skillCategory.update({ where: { id: record.id }, data: { order: index } });

    for (const [itemIndex, item] of category.items.entries()) {
      const existing = await prisma.skillItem.findFirst({
        where: { categoryId: record.id, heading: item.heading },
      });
      if (existing) {
        await prisma.skillItem.update({
          where: { id: existing.id },
          data: { ...item, order: itemIndex },
        });
      } else {
        await prisma.skillItem.create({
          data: { ...item, categoryId: record.id, order: itemIndex },
        });
      }
    }
  }
  console.info("  skills");
}

async function seedJourney() {
  const section = await upsertSection({
    slug: "journey",
    type: "TIMELINE",
    title: "Professional & Academic Journey",
    order: 4,
  });

  const entries = [
    {
      dateLabel: "2025 - Present",
      title: "Tech Wing, Hawassa University Student Union",
      description:
        "Leveraged Python and the Telegram API to develop and maintain the official HUSC Telegram bot, improving communication channels for the student body.",
      logoUrl: IMG("husc.jpg"),
      logoAlt: "HUSC logo",
    },
    {
      dateLabel: "2024 - Present",
      title: "Hawassa University | Hawassa, Ethiopia",
      description:
        "Pursuing a B.Sc. in Information Systems, focusing on software engineering and system analysis. Expected graduation: June 2027.",
      logoUrl: IMG("Hawassa.jpeg"),
      logoAlt: "Hawassa University logo",
    },
    {
      dateLabel: "2018 - 2023",
      title: "Karalo General Secondary School | Addis Ababa, Ethiopia",
      description:
        "Completed high school education, building a strong academic foundation and discovering an initial passion for logic and problem-solving.",
      logoUrl: IMG("AAEB.jpeg"),
      logoAlt: "Karalo School logo",
    },
  ];

  for (const [index, entry] of entries.entries()) {
    const existing = await prisma.timelineEntry.findFirst({
      where: { sectionId: section.id, title: entry.title },
    });
    if (existing) {
      await prisma.timelineEntry.update({ where: { id: existing.id }, data: { ...entry, order: index } });
    } else {
      await prisma.timelineEntry.create({ data: { ...entry, sectionId: section.id, order: index } });
    }
  }

  const stats = [
    { value: "6+", label: "Programming Languages" },
    { value: "25+", label: "Projects Completed" },
    { value: "3rd", label: "Year University Student" },
    { value: "1+", label: "Years of Experience" },
  ];

  for (const [index, stat] of stats.entries()) {
    const existing = await prisma.stat.findFirst({
      where: { sectionId: section.id, label: stat.label },
    });
    if (existing) {
      await prisma.stat.update({ where: { id: existing.id }, data: { ...stat, order: index } });
    } else {
      await prisma.stat.create({ data: { ...stat, sectionId: section.id, order: index } });
    }
  }
  console.info("  journey and statistics");
}

async function seedAccolades() {
  const section = await upsertSection({
    slug: "accolades",
    type: "ACCOLADES",
    title: "The Recognition Report",
    order: 5,
  });

  const accolades = [
    {
      dateLabel: "May 2025",
      title: "Certificate Of Appreciation",
      issuer: "As Awarded By Hawassa University",
      description:
        "For the development of a groundbreaking Telegram bot that revolutionized student feedback systems at Hawassa University, demonstrating exceptional creativity and technical skill.",
      imageUrl: IMG("Award-2.jpg"),
      imageAlt: "Certificate of Appreciation",
    },
    {
      dateLabel: "October 2024",
      title: "Certificate Of Accomplishment",
      issuer: "Awarded By Udacity",
      description:
        "This certificate from Udacity recognizes my completion of the Programming Fundamentals course. I gained essential skills in HTML and CSS, empowering me to create and style web pages effectively.",
      imageUrl: IMG("Award-1.jpg"),
      imageAlt: "Certificate of Accomplishment",
    },
    {
      dateLabel: "November 2024",
      title: "Certificate Of Participation",
      issuer: "Awarded By Great Commission",
      description:
        "This certificate acknowledges my participation in the Hack Hawassa Hackathon. I contributed my tech skills to build impactful solutions aimed at transforming lives and driving positive change in the community.",
      imageUrl: IMG("Award-3.jpg"),
      imageAlt: "Certificate of Participation",
    },
  ];

  for (const [index, accolade] of accolades.entries()) {
    const existing = await prisma.accolade.findFirst({
      where: { sectionId: section.id, title: accolade.title, dateLabel: accolade.dateLabel },
    });
    if (existing) {
      await prisma.accolade.update({ where: { id: existing.id }, data: { ...accolade, order: index } });
    } else {
      await prisma.accolade.create({ data: { ...accolade, sectionId: section.id, order: index } });
    }
  }
  console.info(`  ${accolades.length} accolades`);
}

async function seedBlog() {
  await upsertSection({
    slug: "edition",
    type: "BLOG_TEASER",
    title: "The Latest Edition",
    subtitle: "Dispatches from the desk — notes on building, learning and shipping",
    order: 6,
  });

  const categories = [
    { name: "Engineering", description: "Notes from building real software.", order: 0 },
    { name: "Learning", description: "Lessons from the journey through computer science.", order: 1 },
    { name: "Announcements", description: "News and milestones.", order: 2 },
  ];

  for (const category of categories) {
    const slug = category.name.toLowerCase();
    await prisma.category.upsert({
      where: { slug },
      create: { slug, name: category.name, description: category.description, order: category.order },
      update: {},
    });
  }

  const engineering = await prisma.category.findUnique({ where: { slug: "engineering" } });

  const welcomeMarkdown = `Welcome to **The Latest Edition** — the newsroom attached to my portfolio.

For a long time this site was a single hand-written HTML file. Every time I finished a project I opened the editor, copied a block of markup, adjusted the class names and pushed a commit. It worked, but it meant that writing about my work was always a coding task first and a writing task second.

## What changed

The site now runs on a small API and a database. The design is exactly the same — same typefaces, same rules and column widths, same masthead — but the words and images come from a content system I control from a browser.

That means I can:

- publish an article without touching a repository
- add or reorder sections as the portfolio grows
- keep drafts around until they are actually ready

## What to expect here

Short, practical write-ups: what I built, what broke, and what I would do differently. If that sounds useful, the [RSS feed](/api/feed/rss.xml) will keep you posted.

Thanks for reading.`;

  const existing = await prisma.post.findUnique({ where: { slug: "welcome-to-the-latest-edition" } });
  if (!existing) {
    await prisma.post.create({
      data: {
        slug: "welcome-to-the-latest-edition",
        title: "Welcome to The Latest Edition",
        excerpt:
          "This portfolio used to be a single hand-written HTML file. Here is why it now runs on a database, and what that changes.",
        contentMarkdown: welcomeMarkdown,
        readingMinutes: 2,
        status: "PUBLISHED",
        publishedAt: new Date(),
        isFeatured: true,
        categoryId: engineering?.id ?? null,
        metaTitle: "Welcome to The Latest Edition | The Yonatan Times",
        metaDescription:
          "Why my portfolio moved from a static HTML file to a database-backed publication, and what it means for what I write here.",
      },
    });
  }
  console.info("  blog scaffolding and welcome article");
}

async function main() {
  console.info("Seeding The Yonatan Times…");
  await seedSettings();
  await seedSocialLinks();
  await seedCtaSections();
  await seedProjects();
  await seedSkills();
  await seedJourney();
  await seedAccolades();
  await seedBlog();
  console.info("Done.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
