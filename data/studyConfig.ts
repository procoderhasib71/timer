// src/data/studyConfig.ts

export const STUDY_LEVELS = [
  { id: "hsc", label: "HSC (Higher Secondary)" },
  { id: "mbbs", label: "MBBS (Medical)" },
  { id: "university", label: "University Admission" }
];

export const STUDY_DATA: Record<string, { subject: string; chapters: string[] }[]> = {
  hsc: [
    {
      subject: "Zoology",
      chapters: ["Hydra", "Grasshopper", "Rohu Fish", "Genetics", "Human Physiology"]
    },
    {
      subject: "Botany",
      chapters: ["Cell Division", "Tissue System", "Plant Physiology", "Biotechnology"]
    },
    {
      subject: "Physics",
      chapters: ["Thermodynamics", "Static Electricity", "Modern Physics"]
    }
  ],
  mbbs: [
    {
      subject: "Pathology",
      chapters: ["Cell Injury & Adaptation", "Acute & Chronic Inflammation", "Hemodynamic Disorders", "Neoplasia"]
    },
    {
      subject: "Medicine",
      chapters: ["Clinical History Taking", "Cardiovascular System", "Respiratory System", "Gastroenterology"]
    },
    {
      subject: "Anatomy",
      chapters: ["Thorax", "Abdomen", "Head & Neck", "Neuroanatomy"]
    }
  ],
  university: [
    {
      subject: "General Knowledge",
      chapters: ["Bangladesh Affairs", "International Affairs", "Recent Topics"]
    },
    {
      subject: "English",
      chapters: ["Grammar", "Vocabulary", "Comprehension"]
    }
  ]
};