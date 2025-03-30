import { useState, useEffect } from "react";
import "./App.css";
import Contact from "./components/Contact";
import Auth from "./components/Auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { User } from "firebase/auth";

interface Skill {
  name: string;
  importance: "High" | "Medium" | "Low";
  description: string;
  progress?: number;
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

function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "contact">("home");
  const [careerGoal, setCareerGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [learningPath, setLearningPath] = useState<LearningStep[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showSignInNotice, setShowSignInNotice] = useState(false);

  // Load user progress when they sign in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadUserProgress(user.uid);
      } else {
        // Clear data when user signs out
        setSkills([]);
        setCareerGoal("");
        setLearningPath([]);
        setCourses([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserProgress = async (userId: string) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.skills) {
          setSkills(data.skills);
        }
        if (data.careerGoal) {
          setCareerGoal(data.careerGoal);
        }
        if (data.learningPath) {
          setLearningPath(data.learningPath);
        }
        if (data.courses) {
          setCourses(data.courses);
        }
      } else {
        // Create a new user document if it doesn't exist
        await setDoc(userDocRef, {
          skills: [],
          careerGoal: "",
          learningPath: [],
          courses: [],
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
      await setDoc(
        userDocRef,
        {
          skills,
          careerGoal,
          learningPath,
          courses,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving user progress:", error);
    }
  };

  // Update saveUserProgress whenever relevant state changes
  useEffect(() => {
    if (user) {
      const debounceTimeout = setTimeout(() => {
        saveUserProgress();
      }, 1000); // Debounce the save operation

      return () => clearTimeout(debounceTimeout);
    }
  }, [skills, careerGoal, learningPath, courses, user]);

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
      return JSON.parse(content);
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
      // Search specifically for course pages from trusted platforms
      const searchQuery = `${query} site:udemy.com OR site:coursera.org OR site:edx.org OR site:linkedin.com/learning OR site:pluralsight.com`;
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(
          searchQuery
        )}&num=5`
      );

      if (!response.ok) {
        throw new Error("Search API request failed");
      }

      const data = await response.json();
      if (!data.items) {
        return [];
      }

      return data.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  };

  const getCourseRecommendations = async (
    careerGoal: string,
    skills: Skill[]
  ): Promise<Course[]> => {
    // First, search for relevant courses
    const searchQuery = `${careerGoal} course training certification`;
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

  const handleAnalyze = async () => {
    if (!careerGoal.trim()) {
      alert("Please enter a career goal");
      return;
    }

    if (!user) {
      setShowSignInNotice(true);
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

  return (
    <div className="app-container">
      <header className="app-header">
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
        </nav>
        <h1>🧠 PathFind.AI</h1>
        <p className="subtitle">Discover your learning path to success</p>
      </header>

      <main className="app-main">
        {currentPage === "home" ? (
          <>
            <Auth onAuthChange={setUser} />

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
                    <h2>Skill Gap Analysis</h2>
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
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${skill.progress || 0}%` }}
                              ></div>
                            </div>
                            <div className="progress-controls">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={skill.progress || 0}
                                onChange={(e) =>
                                  updateSkillProgress(
                                    skill.name,
                                    parseInt(e.target.value)
                                  )
                                }
                                className="progress-input"
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
                    <div className="courses-grid">
                      {courses.map((course, index) => (
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
                </section>
              )}
          </>
        ) : (
          <Contact />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by AI to help you achieve your career goals</p>
      </footer>
    </div>
  );
}

export default App;
