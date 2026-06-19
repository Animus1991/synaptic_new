export type CodeExercise = {
  id: string;
  title: string;
  objective: string;
  starterCode: string;
  hints: string[];
  solution: string;
  validate: (code: string) => boolean;
  expectedOutput?: string;
};

export function getPracticeExercises(concept: string): CodeExercise[] {
  const c = concept.toLowerCase();
  if (c.includes('pandas') || c.includes('groupby')) {
    return PANDAS_EXERCISES;
  }
  return GENERIC_EXERCISES(concept);
}

const PANDAS_EXERCISES: CodeExercise[] = [
  {
    id: 'pd-1',
    title: 'GroupBy: Total Revenue by Region',
    objective: 'Use .groupby() to aggregate data by category and compute summary statistics.',
    starterCode: `import pandas as pd

df = pd.read_csv('sales_data.csv')
# TODO: Group by 'region' and calculate total revenue
result = `,
    hints: [
      'Use the .groupby() method on the DataFrame.',
      'After groupby("region"), apply .sum() on the revenue column.',
      'result = df.groupby("region")["revenue"].sum()',
    ],
    solution: `result = df.groupby("region")["revenue"].sum()`,
    validate: (code) => /groupby\s*\(\s*['"]region['"]\s*\)/.test(code) && /\.sum\s*\(\s*\)/.test(code),
    expectedOutput: 'region\nEast     45200\n...',
  },
  {
    id: 'pd-2',
    title: 'GroupBy: Mean Sales by Category',
    objective: 'Compute average sales per product category.',
    starterCode: `import pandas as pd

df = pd.read_csv('sales_data.csv')
# TODO: Mean sales by category
result = `,
    hints: ['Use groupby("category") then ["sales"].mean()'],
    solution: `result = df.groupby("category")["sales"].mean()`,
    validate: (code) => /groupby/.test(code) && /mean/.test(code),
  },
  {
    id: 'pd-3',
    title: 'Multi-index aggregation',
    objective: 'Group by region and category, sum revenue.',
    starterCode: `import pandas as pd

df = pd.read_csv('sales_data.csv')
result = `,
    hints: ['Pass a list to groupby: ["region", "category"]'],
    solution: `result = df.groupby(["region", "category"])["revenue"].sum()`,
    validate: (code) => /groupby\s*\(\s*\[/.test(code),
  },
  {
    id: 'pd-4',
    title: 'Reset index after groupby',
    objective: 'Return a flat DataFrame after aggregation.',
    starterCode: `import pandas as pd

df = pd.read_csv('sales_data.csv')
result = `,
    hints: ['Chain .reset_index() after sum()'],
    solution: `result = df.groupby("region")["revenue"].sum().reset_index()`,
    validate: (code) => /reset_index/.test(code),
  },
  {
    id: 'pd-5',
    title: 'Filter then aggregate',
    objective: 'Filter rows where revenue > 1000, then group by region.',
    starterCode: `import pandas as pd

df = pd.read_csv('sales_data.csv')
result = `,
    hints: ['df[df["revenue"] > 1000].groupby("region")["revenue"].sum()'],
    solution: `result = df[df["revenue"] > 1000].groupby("region")["revenue"].sum()`,
    validate: (code) => /groupby/.test(code) && (/>\s*1000/.test(code) || /revenue/.test(code)),
  },
];

function GENERIC_EXERCISES(concept: string): CodeExercise[] {
  return [{
    id: 'gen-1',
    title: `Practice: ${concept}`,
    objective: `Apply ${concept} in a short exercise.`,
    starterCode: `# TODO: implement solution for ${concept}\nresult = None`,
    hints: [`Recall the definition of ${concept}`, 'Break the problem into steps'],
    solution: `# solution for ${concept}`,
    validate: (code) => code.trim().length > 20 && !code.includes('TODO'),
  }];
}
