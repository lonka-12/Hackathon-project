import { useState } from "react";
import "./App.css";
import Contact from "./components/Contact";

interface Skill {
  name: string;
  importance: "High" | "Medium" | "Low";
  description: string;
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
  description?: string;
  workload?: string;
  enrollmentCount?: number;
  startDate?: string;
}

// API Configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "contact">("home");
  const [careerGoal, setCareerGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [learningPath, setLearningPath] = useState<LearningStep[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

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

  const getCourseRecommendations = async (
    careerGoal: string,
    skills: Skill[]
  ): Promise<Course[]> => {
    try {
      // Create a focused search query based on career goal and top skills
      const topSkills = skills
        .filter((skill) => skill.importance === "High")
        .slice(0, 3)
        .map((s) => s.name);

      const searchQuery = `${careerGoal} ${topSkills.join(" ")}`;

      console.log("Searching for courses with query:", searchQuery);

      // Use environment variable for API URL, fallback to localhost
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

      const response = await fetch(
        `${API_URL}/api/courses?query=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.details || "Failed to fetch courses");
      }

      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        console.log("No courses found, using mock data");
        return getMockCourses(careerGoal);
      }

      // Transform Coursera API response to our Course interface
      const transformedCourses = data.elements
        .map((course: any) => ({
          title: course.name,
          platform: "Coursera",
          rating: course.rating || 0,
          price: "Free", // Note: Actual pricing would require additional API calls
          url: `https://www.coursera.org/learn/${course.shortName}`,
          description: course.description,
          workload: course.workload,
          enrollmentCount: course.enrollmentCount,
          startDate: course.startDate,
        }))
        .slice(0, 4); // Limit to 4 courses

      console.log("Found courses:", transformedCourses);
      return transformedCourses;
    } catch (error) {
      console.error("Error fetching courses:", error);
      return getMockCourses(careerGoal); // Fallback to mock data
    }
  };

  // Helper function to create signature for Coursera API
  const createSignature = async (
    apiKey: string,
    apiSecret: string,
    timestamp: number
  ): Promise<string> => {
    const message = `${apiKey}${timestamp}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Helper function to provide mock courses when API fails
  const getMockCourses = (careerGoal: string): Course[] => {
    const mockCourses: Course[] = [
      {
        title: "Software Engineering Fundamentals",
        platform: "Coursera",
        rating: 4.8,
        price: "Free",
        url: "https://www.coursera.org/learn/software-engineering",
        description:
          "Learn the fundamentals of software engineering, including software development lifecycle, design patterns, and best practices.",
        workload: "4-6 hours/week",
        enrollmentCount: 150000,
        startDate: "Flexible",
      },
      {
        title: "Web Development and Programming",
        platform: "Coursera",
        rating: 4.7,
        price: "Free",
        url: "https://www.coursera.org/learn/web-development",
        description:
          "Master web development with HTML, CSS, JavaScript, and modern frameworks.",
        workload: "5-7 hours/week",
        enrollmentCount: 120000,
        startDate: "Flexible",
      },
      {
        title: "Data Structures and Algorithms",
        platform: "Coursera",
        rating: 4.6,
        price: "Free",
        url: "https://www.coursera.org/learn/data-structures",
        description:
          "Learn essential data structures and algorithms for software development.",
        workload: "6-8 hours/week",
        enrollmentCount: 90000,
        startDate: "Flexible",
      },
      {
        title: "Software Testing and Quality Assurance",
        platform: "Coursera",
        rating: 4.5,
        price: "Free",
        url: "https://www.coursera.org/learn/software-testing",
        description:
          "Learn software testing methodologies and quality assurance practices.",
        workload: "4-5 hours/week",
        enrollmentCount: 75000,
        startDate: "Flexible",
      },
    ];

    // If no specific career goal is provided, return all courses
    if (!careerGoal.trim()) {
      return mockCourses;
    }

    // Convert career goal to lowercase for case-insensitive matching
    const careerGoalLower = careerGoal.toLowerCase();

    // Keywords that indicate software engineering related courses
    const softwareKeywords = [
      "software",
      "programming",
      "developer",
      "development",
      "engineer",
      "coding",
      "web",
      "app",
      "application",
      "computer",
      "tech",
    ];

    // Check if the career goal contains any software-related keywords
    const isSoftwareRelated = softwareKeywords.some((keyword) =>
      careerGoalLower.includes(keyword)
    );

    // If it's software-related, return all courses
    if (isSoftwareRelated) {
      return mockCourses;
    }

    // For other career goals, return filtered courses based on keywords
    const careerKeywords = careerGoalLower.split(" ");
    return mockCourses.filter((course) =>
      careerKeywords.some(
        (keyword) =>
          course.title.toLowerCase().includes(keyword) ||
          (course.description?.toLowerCase() || "").includes(keyword)
      )
    );
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
    } catch (error: any) {
      console.error("Error:", error);
      alert(
        `An error occurred while analyzing your career path: ${error.message}`
      );
    } finally {
      setIsLoading(false);
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
        <h1>🧠 AI Skill Gap Analyzer</h1>
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
                            className={`importance ${skill.importance.toLowerCase()}`}
                          >
                            {skill.importance}
                          </p>
                          <p>{skill.description}</p>
                        </div>
                      ))}
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
