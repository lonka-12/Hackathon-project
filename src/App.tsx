import { useState, useEffect } from "react";
import "./App.css";
import Contact from "./components/Contact";
import Auth from "./pages/Auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { User } from "firebase/auth";
import { signOut } from "firebase/auth";

interface Skill {
  name: string;
  importance: "High" | "Medium" | "Low";
  description: string;
  progress?: number;
  currentLevel: number;
  targetLevel: number;
}

interface ResumeAnalysis {
  strengths: string[];
  areasForImprovement: string[];
  suggestedSkills: string[];
  experienceGap: string[];
  recommendations: string[];
}

interface LearningStep {
  title: string;
  description: string;
  duration: string;
}

interface Course {
  title: string;
  platform: string;
  rating: number;
  price: string;
  url: string;
  description: string;
  workload: string;
  enrollmentCount: number;
  startDate: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface CourseFilters {
  priceRange: "Free" | "Under $50" | "$50-$100" | "Over $100";
  platform: string;
  minRating: number;
  workload: "Short" | "Medium" | "Long";
}

interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
  url: string;
  requirements: string[];
}

// Add this interface after the other interfaces
interface AnalyzedJob {
  id: string;
  title: string;
  date: string;
  skills: Skill[];
  learningPath: LearningStep[];
  courses: Course[];
  jobs: Job[];
}

// Manual course recommendations based on job titles
const courseRecommendations: { [key: string]: Course[] } = {
  "Software Engineer": [
    {
      title: "Complete Web Development Bootcamp",
      platform: "Udemy",
      rating: 4.8,
      price: "$49.99",
      url: "https://www.udemy.com/course/the-complete-web-development-bootcamp/",
      description:
        "Learn HTML, CSS, JavaScript, Node.js, React, and more to become a full-stack developer.",
      workload: "40 hours",
      enrollmentCount: 500000,
      startDate: "Flexible",
    },
    {
      title: "Data Structures and Algorithms",
      platform: "Coursera",
      rating: 4.7,
      price: "Free",
      url: "https://www.coursera.org/learn/data-structures-algorithms",
      description:
        "Master fundamental computer science concepts and problem-solving skills.",
      workload: "6-8 hours/week",
      enrollmentCount: 200000,
      startDate: "Flexible",
    },
    {
      title: "System Design for Developers",
      platform: "Educative.io",
      rating: 4.6,
      price: "$49/month",
      url: "https://www.educative.io/courses/grokking-the-system-design-interview",
      description:
        "Learn how to design scalable systems and prepare for system design interviews.",
      workload: "30 hours",
      enrollmentCount: 100000,
      startDate: "Flexible",
    },
  ],
  "Data Scientist": [
    {
      title: "Data Science Specialization",
      platform: "Coursera",
      rating: 4.8,
      price: "Free",
      url: "https://www.coursera.org/specializations/jhu-data-science",
      description:
        "Comprehensive introduction to data science, including R programming, statistics, and machine learning.",
      workload: "8-10 hours/week",
      enrollmentCount: 300000,
      startDate: "Flexible",
    },
    {
      title: "Machine Learning A-Z",
      platform: "Udemy",
      rating: 4.7,
      price: "$49.99",
      url: "https://www.udemy.com/course/machinelearning/",
      description:
        "Learn to create Machine Learning Algorithms in Python and R from two Data Science experts.",
      workload: "44 hours",
      enrollmentCount: 400000,
      startDate: "Flexible",
    },
  ],
  "Product Manager": [
    {
      title: "Digital Product Management",
      platform: "Coursera",
      rating: 4.6,
      price: "Free",
      url: "https://www.coursera.org/specializations/product-management",
      description:
        "Learn the fundamentals of product management and how to build successful products.",
      workload: "6-8 hours/week",
      enrollmentCount: 150000,
      startDate: "Flexible",
    },
    {
      title: "Product Management 101",
      platform: "Udemy",
      rating: 4.5,
      price: "$29.99",
      url: "https://www.udemy.com/course/product-management-101/",
      description:
        "Learn the basics of product management and how to become a successful product manager.",
      workload: "4 hours",
      enrollmentCount: 100000,
      startDate: "Flexible",
    },
  ],
};

// API Configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const GOOGLE_SEARCH_API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;
const JOOBLE_API_KEY = import.meta.env.VITE_JOOBLE_API_KEY;

// Add this after the other interfaces
const US_STATES = [
  "All",
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "contact" | "auth">(
    "home"
  );
  const [careerGoal, setCareerGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [learningPath, setLearningPath] = useState<LearningStep[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showSignInNotice, setShowSignInNotice] = useState(false);
  const [showCourseFilters, setShowCourseFilters] = useState(false);
  const [courseFilters, setCourseFilters] = useState<CourseFilters>({
    priceRange: "Free",
    platform: "All",
    minRating: 4.0,
    workload: "Medium",
  });
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isSearchingCourses, setIsSearchingCourses] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme as "light" | "dark";
    }
    // Check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [isDragging, setIsDragging] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState("All");
  const [showJobFilters, setShowJobFilters] = useState(false);
  const [analyzedJobs, setAnalyzedJobs] = useState<AnalyzedJob[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Update theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // Update the useEffect for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        // Clear existing data before loading new user's data
        setSkills([]);
        setCareerGoal("");
        setLearningPath([]);
        setCourses([]);
        setJobs([]);
        setAnalyzedJobs([]);
        setJobTitles([]);
        setSelectedState("All");
        setShowJobFilters(false);
        // Load the new user's data
        loadUserProgress(user.uid);
      } else {
        // Clear all data when signing out
        setSkills([]);
        setCareerGoal("");
        setLearningPath([]);
        setCourses([]);
        setJobs([]);
        setAnalyzedJobs([]);
        setJobTitles([]);
        setSelectedState("All");
        setShowJobFilters(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("user-dropdown");
      const userInfo = document.getElementById("user-info");
      if (
        dropdown &&
        userInfo &&
        !userInfo.contains(event.target as Node) &&
        !dropdown.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUserProgress = async (userId: string) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.jobHistory) {
          // Extract job titles from job history
          const titles = Object.keys(data.jobHistory);
          setJobTitles(titles);

          // Convert job history to analyzedJobs format
          const analyzedJobsList = titles.map((title) => ({
            id: data.jobHistory[title].id,
            title: title,
            date: data.jobHistory[title].date,
            skills: data.jobHistory[title].skills,
            learningPath: data.jobHistory[title].learningPath,
            courses: data.jobHistory[title].courses,
            jobs: data.jobHistory[title].jobs,
          }));
          setAnalyzedJobs(analyzedJobsList);
        }
      } else {
        // Create a new user document if it doesn't exist
        await setDoc(userDocRef, {
          jobHistory: {},
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error loading user progress:", error);
    }
  };

  const saveUserProgress = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);

      // Convert analyzedJobs to jobHistory format
      const jobHistory = analyzedJobs.reduce((acc, job) => {
        acc[job.title] = {
          id: job.id,
          date: job.date,
          skills: job.skills.map((skill) => ({
            ...skill,
            progress: skill.progress || 0, // Ensure progress is saved
          })),
          learningPath: job.learningPath,
          courses: job.courses,
          jobs: job.jobs,
        };
        return acc;
      }, {} as Record<string, any>);

      await setDoc(
        userDocRef,
        {
          jobHistory,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving user progress:", error);
    }
  };

  // Update the useEffect for saving progress
  useEffect(() => {
    if (user && (analyzedJobs.length > 0 || skills.length > 0)) {
      const debounceTimeout = setTimeout(() => {
        saveUserProgress();
      }, 1000); // Debounce the save operation

      return () => clearTimeout(debounceTimeout);
    }
  }, [analyzedJobs, skills, user]); // Add skills to dependencies

  const updateSkillProgress = (skillName: string, progress: number) => {
    setSkills((prevSkills) =>
      prevSkills.map((skill) =>
        skill.name === skillName
          ? { ...skill, progress: Math.min(100, Math.max(0, progress)) }
          : skill
      )
    );
  };

  const analyzeSkillGap = async (careerGoal: string): Promise<Skill[]> => {
    const prompt = `Analyze the required skills for a ${careerGoal} position. 
                   Provide a list of technical and soft skills needed, along with their importance level (High/Medium/Low).
                   Format the response as a JSON array of objects with properties: name, importance, description.
                   Example: [{"name": "JavaScript", "importance": "High", "description": "Core programming language"}]`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const skills = JSON.parse(content);

      // Add default progress of 0 to each skill
      return skills.map((skill: Skill) => ({
        ...skill,
        progress: 0,
      }));
    } catch (error) {
      console.error("Detailed error:", error);
      throw error;
    }
  };

  const generateLearningPath = async (
    careerGoal: string,
    skills: Skill[]
  ): Promise<LearningStep[]> => {
    const skillsList = skills.map((s) => s.name).join(", ");
    const prompt = `Create a learning path for becoming a ${careerGoal}. 
                   Consider these required skills: ${skillsList}
                   Format the response as a JSON array of objects with properties: title, description, duration.
                   Example: [{"title": "Foundation", "description": "Learn basics", "duration": "3 months"}]`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error("Detailed error:", error);
      throw error;
    }
  };

  const searchCourses = async (query: string): Promise<SearchResult[]> => {
    try {
      // Search for courses with a more focused query
      const searchQuery = `${query} "online course" OR "training program" OR "certification"`;
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(
          searchQuery
        )}&num=10&exactTerms=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google API Error:", errorData);
        throw new Error(
          `Search API request failed: ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        // If no results found, try a broader search
        const broaderQuery = `${query} learn tutorial`;
        const broaderResponse = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(
            broaderQuery
          )}&num=10`
        );

        if (!broaderResponse.ok) {
          throw new Error("Broader search API request failed");
        }

        const broaderData = await broaderResponse.json();
        if (!broaderData.items || broaderData.items.length === 0) {
          console.error("No search results found for either query");
          return [];
        }

        return broaderData.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        }));
      }

      return data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to manual course recommendations if search fails
      const manualCourses = courseRecommendations[query] || [];
      if (manualCourses.length > 0) {
        return manualCourses.map((course) => ({
          title: course.title,
          link: course.url,
          snippet: course.description,
        }));
      }
      return [];
    }
  };

  const getCourseRecommendations = async (
    careerGoal: string,
    skills: Skill[]
  ): Promise<Course[]> => {
    // First, search for relevant courses
    const searchQuery = `${careerGoal} course`;
    const searchResults = await searchCourses(searchQuery);

    if (searchResults.length === 0) {
      console.error("No course search results found");
      return [];
    }

    // Create a prompt for OpenAI to analyze the search results and generate descriptions
    const skillsList = skills
      .map((s) => `${s.name} (${s.importance})`)
      .join(", ");

    const searchResultsText = searchResults
      .map(
        (result, index) =>
          `${index + 1}. ${result.title}\n   URL: ${result.link}\n   Snippet: ${
            result.snippet
          }`
      )
      .join("\n\n");

    const prompt = `You are a course recommendation system. Analyze these real course search results and provide detailed descriptions for each course.
                   Career Goal: ${careerGoal}
                   Required Skills: ${skillsList}
                   
                   Here are the real course search results:
                   ${searchResultsText}
                   
                   IMPORTANT: Respond with ONLY a JSON array containing course objects. Each course object must have these exact properties with double quotes.
                   Use the exact URLs from the search results, but provide your own detailed descriptions and other metadata.
                   
                   Each course object must have these exact properties with double quotes:
                   - "title": string (use the exact title from search results)
                   - "platform": string (determine from the URL)
                   - "rating": number (out of 5, between 4.0 and 5.0)
                   - "price": string (write "Free" if free, otherwise use format like "$49.99" or "$29.99/month")
                   - "url": string (use the exact URL from search results)
                   - "description": string (write a detailed, engaging description of what this course covers and its benefits)
                   - "workload": string (e.g., "40 hours" or "6-8 hours/week")
                   - "enrollmentCount": number (realistic number between 10000 and 500000)
                   - "startDate": string (write "Flexible" if self-paced)
                   
                   Example format:
                   [
                     {
                       "title": "Complete Web Development Bootcamp",
                       "platform": "Udemy",
                       "rating": 4.8,
                       "price": "$49.99",
                       "url": "https://www.udemy.com/course/the-complete-web-development-bootcamp/",
                       "description": "Learn HTML, CSS, JavaScript, Node.js, React, and more to become a full-stack developer.",
                       "workload": "40 hours",
                       "enrollmentCount": 500000,
                       "startDate": "Flexible"
                     }
                   ]`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Clean the content to ensure valid JSON
      const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "");

      try {
        const recommendedCourses = JSON.parse(cleanedContent);

        // Validate and ensure all required fields are present
        return recommendedCourses.map((course: any) => {
          // Validate URL based on platform
          let validUrl = course.url;
          if (
            course.platform === "Udemy" &&
            !course.url.includes("udemy.com/course/")
          ) {
            validUrl = "https://www.udemy.com/course/web-development-bootcamp/";
          } else if (
            course.platform === "Coursera" &&
            !course.url.includes("coursera.org/")
          ) {
            validUrl = "https://www.coursera.org/learn/web-development";
          } else if (
            course.platform === "edX" &&
            !course.url.includes("edx.org/course/")
          ) {
            validUrl = "https://www.edx.org/course/web-development";
          } else if (
            course.platform === "LinkedIn Learning" &&
            !course.url.includes("linkedin.com/learning/")
          ) {
            validUrl = "https://www.linkedin.com/learning/web-development";
          } else if (
            course.platform === "Pluralsight" &&
            !course.url.includes("pluralsight.com/courses/")
          ) {
            validUrl = "https://www.pluralsight.com/courses/web-development";
          }

          return {
            title: course.title || "Course Title",
            platform: course.platform || "Platform",
            rating: course.rating || 4.5,
            price: course.price || "Free",
            url: validUrl,
            description: course.description || "Course description",
            workload: course.workload || "Flexible",
            enrollmentCount: course.enrollmentCount || 50000,
            startDate: course.startDate || "Flexible",
          };
        });
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Raw content:", cleanedContent);
        throw new Error("Failed to parse course recommendations");
      }
    } catch (error) {
      console.error("Error fetching course recommendations:", error);
      // Fallback to default courses if API fails
      return [
        {
          title: "Career Development Fundamentals",
          platform: "LinkedIn Learning",
          rating: 4.5,
          price: "$29.99/month",
          url: "https://www.linkedin.com/learning/career-development-fundamentals",
          description:
            "Learn essential skills for professional development and career growth.",
          workload: "4 hours",
          enrollmentCount: 50000,
          startDate: "Flexible",
        },
        {
          title: "Professional Skills Development",
          platform: "Coursera",
          rating: 4.4,
          price: "Free",
          url: "https://www.coursera.org/learn/professional-skills",
          description:
            "Develop key professional skills needed in today's workplace.",
          workload: "5-6 hours/week",
          enrollmentCount: 75000,
          startDate: "Flexible",
        },
      ];
    }
  };

  const analyzeResume = async (
    resumeImage: File,
    careerGoal: string
  ): Promise<ResumeAnalysis> => {
    try {
      // Convert the image file to base64
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix to get just the base64 string
          resolve(base64String.split(",")[1]);
        };
        reader.readAsDataURL(resumeImage);
      });

      const prompt = `Analyze this resume image for someone aiming to become a ${careerGoal}. 
                     Provide detailed feedback in the following areas:
                     1. Current strengths
                     2. Areas for improvement
                     3. Suggested skills to learn
                     4. Experience gaps
                     5. Specific recommendations
                     
                     Format the response as a JSON object with these exact properties:
                     {
                       "strengths": string[],
                       "areasForImprovement": string[],
                       "suggestedSkills": string[],
                       "experienceGap": string[],
                       "recommendations": string[]
                     }`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error("Resume analysis error:", error);
      throw error;
    }
  };

  const saveAnalyzedJob = (
    careerGoal: string,
    skills: Skill[],
    learningPath: LearningStep[],
    courses: Course[],
    jobs: Job[]
  ) => {
    const newJob: AnalyzedJob = {
      id: Date.now().toString(),
      title: careerGoal,
      date: new Date().toLocaleDateString(),
      skills,
      learningPath,
      courses,
      jobs,
    };

    // Update analyzedJobs state
    setAnalyzedJobs((prev) => {
      const existingIndex = prev.findIndex((job) => job.title === careerGoal);
      if (existingIndex >= 0) {
        // Update existing job
        const updated = [...prev];
        updated[existingIndex] = newJob;
        return updated;
      }
      // Add new job
      return [newJob, ...prev];
    });

    // Update jobTitles state
    setJobTitles((prev) => {
      if (!prev.includes(careerGoal)) {
        return [careerGoal, ...prev];
      }
      return prev;
    });
  };

  const handleAnalyze = async () => {
    if (!careerGoal.trim()) {
      alert("Please enter a career goal");
      return;
    }

    if (!OPENAI_API_KEY) {
      alert("OpenAI API key is not configured. Please check your .env file.");
      return;
    }

    setIsLoading(true);
    try {
      // Get skill gap analysis
      const analyzedSkills = await analyzeSkillGap(careerGoal);
      setSkills(analyzedSkills);

      // Generate learning path
      const path = await generateLearningPath(careerGoal, analyzedSkills);
      setLearningPath(path);

      // Get course recommendations
      const recommendedCourses = await getCourseRecommendations(
        careerGoal,
        analyzedSkills
      );
      setCourses(recommendedCourses);

      // Search for jobs
      await searchJobs(selectedState);

      // Save the analyzed job with all data including jobs
      saveAnalyzedJob(
        careerGoal,
        analyzedSkills,
        path,
        recommendedCourses,
        jobs
      );

      // Show sign-in notice if user is not signed in
      if (!user) {
        setShowSignInNotice(true);
      }
    } catch (error: any) {
      console.error("Error:", error);
      alert(
        `An error occurred while analyzing your career path: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAnalyze();
    }
  };

  const handleCourseSearch = async () => {
    setIsSearchingCourses(true);
    try {
      const searchQuery = `${careerGoal} course ${
        courseFilters.platform !== "All"
          ? `site:${courseFilters.platform.toLowerCase()}.com`
          : ""
      }`;
      const searchResults = await searchCourses(searchQuery);

      if (searchResults.length === 0) {
        setFilteredCourses([]);
        return;
      }

      // Create a prompt for OpenAI to analyze the search results with filters
      const skillsList = skills
        .map((s) => `${s.name} (${s.importance})`)
        .join(", ");
      const searchResultsText = searchResults
        .map(
          (result, index) =>
            `${index + 1}. ${result.title}\n   URL: ${
              result.link
            }\n   Snippet: ${result.snippet}`
        )
        .join("\n\n");

      const prompt = `You are a course recommendation system. Analyze these real course search results and provide detailed descriptions for each course.
                     Career Goal: ${careerGoal}
                     Required Skills: ${skillsList}
                     
                     Filter Requirements:
                     - Price Range: ${courseFilters.priceRange}
                     - Minimum Rating: ${courseFilters.minRating}
                     - Workload Preference: ${courseFilters.workload}
                     
                     Here are the real course search results:
                     ${searchResultsText}
                     
                     IMPORTANT: Respond with ONLY a JSON array containing course objects that match the filter requirements.
                     Each course object must have these exact properties with double quotes:
                     - "title": string (use the exact title from search results)
                     - "platform": string (determine from the URL)
                     - "rating": number (out of 5, between ${courseFilters.minRating} and 5.0)
                     - "price": string (write "Free" if free, otherwise use format like "$49.99" or "$29.99/month")
                     - "url": string (use the exact URL from search results)
                     - "description": string (write a detailed, engaging description)
                     - "workload": string (e.g., "40 hours" or "6-8 hours/week")
                     - "enrollmentCount": number (realistic number between 10000 and 500000)
                     - "startDate": string (write "Flexible" if self-paced)`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch course recommendations");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "");
      const recommendedCourses = JSON.parse(cleanedContent);

      setFilteredCourses(recommendedCourses);
    } catch (error) {
      console.error("Error searching courses:", error);
      setFilteredCourses([]);
    } finally {
      setIsSearchingCourses(false);
    }
  };

  const handleProgressChange = (skillName: string, newProgress: number) => {
    // Update the skills state
    setSkills((prevSkills) =>
      prevSkills.map((skill) =>
        skill.name === skillName
          ? { ...skill, progress: Math.max(0, Math.min(100, newProgress)) }
          : skill
      )
    );

    // Update the analyzedJobs state to reflect the progress change
    if (careerGoal) {
      setAnalyzedJobs((prev) =>
        prev.map((job) =>
          job.title === careerGoal
            ? {
                ...job,
                skills: job.skills.map((skill) =>
                  skill.name === skillName
                    ? {
                        ...skill,
                        progress: Math.max(0, Math.min(100, newProgress)),
                      }
                    : skill
                ),
              }
            : job
        )
      );
    }
  };

  const handleProgressInputChange = (skillName: string, value: string) => {
    const newProgress = parseInt(value) || 0;
    handleProgressChange(skillName, newProgress);
  };

  const handleProgressMouseDown = (skillName: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveSkill(skillName);
    const progress = calculateProgress(e);
    handleProgressChange(skillName, progress);
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !activeSkill) return;
    e.preventDefault();
    const progress = calculateProgress(e);
    handleProgressChange(activeSkill, progress);
  };

  const handleProgressMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setActiveSkill(null);
  };

  const calculateProgress = (e: React.MouseEvent | MouseEvent) => {
    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const progress = ((e.clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isDragging || !activeSkill) return;
        const progress = calculateProgress(e);
        handleProgressChange(activeSkill, progress);
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setActiveSkill(null);
      };

      window.addEventListener("mousemove", handleGlobalMouseMove, {
        passive: false,
      });
      window.addEventListener("mouseup", handleGlobalMouseUp, {
        passive: true,
      });
      window.addEventListener("mouseleave", handleGlobalMouseUp, {
        passive: true,
      });

      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
        window.removeEventListener("mouseleave", handleGlobalMouseUp);
      };
    }
  }, [isDragging, activeSkill]);

  const searchJobs = async (selectedStated: string) => {
    setIsLoadingJobs(true);
    setJobError(null);

    try {
      var url = "https://jooble.org/api/";
      var key = JOOBLE_API_KEY;
      var params = `{ keywords: '${careerGoal}'${
        selectedStated !== "All" ? `, location: '${selectedStated}'` : ""
      }}`;
      var http = new XMLHttpRequest();
      //open connection. true - asynchronous, false - synchronous
      http.open("POST", url + key, true);

      //Send the proper header information
      http.setRequestHeader("Content-type", "application/json");

      //Callback when the state changes
      http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
          // Process and format the jobs data
          const data = JSON.parse(http.responseText);
          const formattedJobs: Job[] = data.jobs
            .slice(0, 3)
            .map((job: any) => ({
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.snippet,
              salary: job.salary || "No salary information",
              url: job.link,
              requirements: job.requirements || [],
            }));

          setJobs(formattedJobs);
        }
      };
      //Send request to the server
      http.send(params);
    } catch (error) {
      setJobError(
        "Failed to fetch job recommendations. Please try again later."
      );
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Add this function after the other state management functions
  const deleteJobFromHistory = (title: string) => {
    // Remove from analyzedJobs
    setAnalyzedJobs((prev) => prev.filter((job) => job.title !== title));

    // Remove from jobTitles
    setJobTitles((prev) => prev.filter((t) => t !== title));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="user-status-container">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <i
              className={`fas ${theme === "light" ? "fa-moon" : "fa-sun"}`}
              style={{
                fontSize: "16px",
                color: "#FFD700", // Changed to yellow color
              }}
            ></i>
          </button>
          {user ? (
            <div className="user-info-container">
              <div
                id="user-info"
                className="user-info"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="user-email">{user.email}</span>
                <div className="user-avatar">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
              </div>
              {showDropdown && (
                <div id="user-dropdown" className="user-dropdown">
                  <div className="dropdown-header">
                    <div
                      className="user-avatar-large"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "#6c5ce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        aspectRatio: "1 / 1", // Force square aspect ratio
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          color: "white",
                          lineHeight: "1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {user.email?.[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.email}</span>
                      <span className="user-role">Member</span>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <a
                    href="https://myaccount.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dropdown-item"
                  >
                    <i className="fas fa-user"></i>
                    Google Account Settings
                  </a>
                  <button
                    className="dropdown-item sign-out"
                    onClick={() => {
                      signOut(auth);
                      setShowDropdown(false);
                    }}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="guest-status">
              <span>Guest User</span>
              <button
                className="sign-in-prompt"
                onClick={() => setCurrentPage("auth")}
              >
                Sign In to Save Progress
              </button>
            </div>
          )}
        </div>
        <div className="header-content">
          <nav className="nav-menu">
            <button
              className={`nav-button ${currentPage === "home" ? "active" : ""}`}
              onClick={() => setCurrentPage("home")}
            >
              Home
            </button>
            <button
              className={`nav-button ${
                currentPage === "contact" ? "active" : ""
              }`}
              onClick={() => setCurrentPage("contact")}
            >
              Contact
            </button>
            <button
              className={`nav-button ${currentPage === "auth" ? "active" : ""}`}
              onClick={() => setCurrentPage("auth")}
            >
              {user ? "Account" : "Sign In"}
            </button>
          </nav>
        </div>
        <h1>🧠 PathFind.AI</h1>
        <p className="subtitle">Discover your learning path to success</p>
      </header>

      <main className="app-main">
        {currentPage === "home" ? (
          <>
            <section className="input-section">
              <div className="search-container">
                <input
                  type="text"
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your career goal (e.g., 'Software Engineer')"
                  className="career-input"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="analyze-button"
                >
                  {isLoading ? "Analyzing..." : "Analyze Skills"}
                </button>
              </div>
              {showSignInNotice && !user && (
                <p className="sign-in-notice">
                  Sign in to analyze skills and save your progress!
                </p>
              )}
            </section>

            {isLoading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Analyzing your career path...</p>
              </div>
            )}

            {!isLoading &&
              (skills.length > 0 ||
                learningPath.length > 0 ||
                courses.length > 0) && (
                <section className="results-section">
                  <div className="skill-gap-analysis">
                    <h2>Required Skills</h2>
                    <div className="skills-grid">
                      {skills.map((skill, index) => (
                        <div key={index} className="skill-card">
                          <h3>{skill.name}</h3>
                          <p
                            className={`importance ${(
                              skill.importance || "Medium"
                            ).toLowerCase()}`}
                          >
                            {skill.importance || "Medium"}
                          </p>
                          <p>{skill.description}</p>
                          <div className="skill-progress">
                            <div
                              className="progress-bar"
                              onClick={(e) => {
                                const progress = calculateProgress(e);
                                handleProgressChange(skill.name, progress);
                              }}
                              onMouseDown={(e) =>
                                handleProgressMouseDown(skill.name, e)
                              }
                              onMouseMove={handleProgressMouseMove}
                              onMouseUp={handleProgressMouseUp}
                              onMouseLeave={handleProgressMouseUp}
                            >
                              <div
                                className="progress-fill"
                                style={{ width: `${skill.progress}%` }}
                              />
                            </div>
                            <div className="progress-controls">
                              <input
                                type="number"
                                className="progress-input"
                                value={skill.progress}
                                onChange={(e) =>
                                  handleProgressInputChange(
                                    skill.name,
                                    e.target.value
                                  )
                                }
                                min="0"
                                max="100"
                              />
                              <span className="progress-percentage">%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="overall-progress">
                      <h3>Overall Progress</h3>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              skills.reduce(
                                (acc, skill) => acc + (skill.progress || 0),
                                0
                              ) / skills.length
                            }%`,
                          }}
                        ></div>
                      </div>
                      <p className="progress-text">
                        {Math.round(
                          skills.reduce(
                            (acc, skill) => acc + (skill.progress || 0),
                            0
                          ) / skills.length
                        )}
                        % Complete
                      </p>
                    </div>
                  </div>

                  <div className="learning-path">
                    <h2>Recommended Learning Path</h2>
                    <div className="path-timeline">
                      {learningPath.map((step, index) => (
                        <div key={index} className="timeline-step">
                          <div className="timeline-marker"></div>
                          <div className="timeline-content">
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                            <span className="timeline-duration">
                              {step.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="course-recommendations">
                    <h2>Course Recommendations</h2>
                    <div className="course-filters">
                      <button
                        className="filter-toggle-button"
                        onClick={() => setShowCourseFilters(!showCourseFilters)}
                      >
                        {showCourseFilters ? "Hide Filters" : "Show Filters"}
                      </button>

                      {showCourseFilters && (
                        <div className="filters-container">
                          <div className="filter-group">
                            <label>Price Range:</label>
                            <select
                              value={courseFilters.priceRange}
                              onChange={(e) =>
                                setCourseFilters({
                                  ...courseFilters,
                                  priceRange: e.target
                                    .value as CourseFilters["priceRange"],
                                })
                              }
                            >
                              <option value="Free">Free</option>
                              <option value="Under $50">Under $50</option>
                              <option value="$50-$100">$50-$100</option>
                              <option value="Over $100">Over $100</option>
                            </select>
                          </div>

                          <div className="filter-group">
                            <label>Platform:</label>
                            <select
                              value={courseFilters.platform}
                              onChange={(e) =>
                                setCourseFilters({
                                  ...courseFilters,
                                  platform: e.target.value,
                                })
                              }
                            >
                              <option value="All">All Platforms</option>
                              <option value="Udemy">Udemy</option>
                              <option value="Coursera">Coursera</option>
                              <option value="edX">edX</option>
                              <option value="LinkedIn">
                                LinkedIn Learning
                              </option>
                              <option value="Pluralsight">Pluralsight</option>
                            </select>
                          </div>

                          <div className="filter-group">
                            <label>Minimum Rating:</label>
                            <select
                              value={courseFilters.minRating}
                              onChange={(e) =>
                                setCourseFilters({
                                  ...courseFilters,
                                  minRating: parseFloat(e.target.value),
                                })
                              }
                            >
                              <option value="4.0">4.0+ Stars</option>
                              <option value="4.5">4.5+ Stars</option>
                              <option value="4.8">4.8+ Stars</option>
                            </select>
                          </div>

                          <div className="filter-group">
                            <label>Workload:</label>
                            <select
                              value={courseFilters.workload}
                              onChange={(e) =>
                                setCourseFilters({
                                  ...courseFilters,
                                  workload: e.target
                                    .value as CourseFilters["workload"],
                                })
                              }
                            >
                              <option value="Short">Short (1-10 hours)</option>
                              <option value="Medium">
                                Medium (10-30 hours)
                              </option>
                              <option value="Long">Long (30+ hours)</option>
                            </select>
                          </div>

                          <button
                            className="search-courses-button"
                            onClick={handleCourseSearch}
                            disabled={isSearchingCourses}
                          >
                            {isSearchingCourses
                              ? "Searching..."
                              : "Search Courses"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="courses-grid">
                      {(filteredCourses.length > 0
                        ? filteredCourses
                        : courses
                      ).map((course, index) => (
                        <div key={index} className="course-card">
                          <h3>{course.title}</h3>
                          <p className="platform">{course.platform}</p>
                          {course.description && (
                            <p className="course-description">
                              {course.description}
                            </p>
                          )}
                          <div className="course-details">
                            {course.workload && (
                              <span className="workload">
                                <i className="fas fa-clock"></i>{" "}
                                {course.workload}
                              </span>
                            )}
                            {course.enrollmentCount && (
                              <span className="enrollment">
                                <i className="fas fa-users"></i>{" "}
                                {course.enrollmentCount.toLocaleString()}{" "}
                                enrolled
                              </span>
                            )}
                          </div>
                          <div className="rating">
                            <span className="stars">
                              {"★".repeat(Math.floor(course.rating))}
                            </span>
                            <span className="rating-value">
                              {course.rating}
                            </span>
                          </div>
                          <p className="price">{course.price}</p>
                          <a
                            href={course.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="course-link"
                          >
                            Learn More
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Job Recommendations Section */}
                  <div className="job-recommendations">
                    <h2>Recommended Jobs</h2>
                    <div className="job-filters">
                      <button
                        className="filter-toggle-button"
                        onClick={() => setShowJobFilters(!showJobFilters)}
                      >
                        {showJobFilters ? "Hide Filters" : "Show Filters"}
                      </button>

                      {showJobFilters && (
                        <div className="filters-container">
                          <div className="filter-group">
                            <label>Location:</label>
                            <select
                              value={selectedState}
                              onChange={(e) => {
                                setSelectedState(e.target.value);
                                searchJobs(e.target.value);
                              }}
                            >
                              {US_STATES.map((state) => (
                                <option key={state} value={state}>
                                  {state}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                    {isLoadingJobs ? (
                      <div className="loading">
                        Loading job recommendations...
                      </div>
                    ) : jobError ? (
                      <div className="error">{jobError}</div>
                    ) : jobs.length > 0 ? (
                      <div className="jobs-grid">
                        {jobs.map((job, index) => (
                          <div key={index} className="job-card">
                            <h3>{job.title}</h3>
                            <p className="company">{job.company}</p>
                            <p className="location">
                              <i className="fas fa-map-marker-alt"></i>{" "}
                              {job.location}
                            </p>
                            <p className="salary">
                              <i className="fas fa-money-bill-wave"></i>{" "}
                              {job.salary}
                            </p>
                            <div className="job-description">
                              <p>{job.description}</p>
                            </div>
                            {job.requirements.length > 0 && (
                              <div className="requirements">
                                <h4>Requirements:</h4>
                                <ul>
                                  {job.requirements.map((req, idx) => (
                                    <li key={idx}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="apply-button"
                            >
                              Apply Now
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No job recommendations available at the moment.</p>
                    )}
                  </div>
                </section>
              )}
          </>
        ) : currentPage === "contact" ? (
          <Contact />
        ) : (
          <Auth onAuthChange={setUser} />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by AI</p>
      </footer>

      <div className="history-sidebar">
        <h3>Path History</h3>
        <div className="history-list">
          {jobTitles.map((title, index) => (
            <div key={index} className="history-item">
              <div className="history-item-header">
                <h4>{title}</h4>
                <div className="history-item-actions">
                  <span className="history-date">
                    {analyzedJobs.find((job) => job.title === title)?.date ||
                      "Not analyzed"}
                  </span>
                  <button
                    className="delete-job-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          "Are you sure you want to delete this path?"
                        )
                      ) {
                        deleteJobFromHistory(title);
                      }
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
              {analyzedJobs.find((job) => job.title === title) && (
                <div className="history-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(() => {
                          const job = analyzedJobs.find(
                            (job) => job.title === title
                          );
                          if (!job?.skills?.length) return 0;
                          return (
                            job.skills.reduce(
                              (acc, skill) => acc + (skill.progress || 0),
                              0
                            ) / job.skills.length
                          );
                        })()}%`,
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {(() => {
                      const job = analyzedJobs.find(
                        (job) => job.title === title
                      );
                      if (!job?.skills?.length) return 0;
                      return Math.round(
                        job.skills.reduce(
                          (acc, skill) => acc + (skill.progress || 0),
                          0
                        ) / job.skills.length
                      );
                    })()}
                    % Complete
                  </span>
                </div>
              )}
              <button
                className="load-history-button"
                onClick={() => {
                  const job = analyzedJobs.find((job) => job.title === title);
                  if (job) {
                    setCareerGoal(job.title);
                    setSkills(job.skills);
                    setLearningPath(job.learningPath);
                    setCourses(job.courses);
                    setJobs(job.jobs);
                    setShowJobFilters(true);
                    setSelectedState("All");
                  } else {
                    setCareerGoal(title);
                    handleAnalyze();
                  }
                }}
              >
                {analyzedJobs.find((job) => job.title === title)
                  ? "Load Analysis"
                  : "Analyze"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
