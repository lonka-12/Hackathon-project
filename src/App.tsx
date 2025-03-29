import { useState } from "react";
import "./App.css";

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
}

// API Configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function App() {
  console.log("API Key loaded:", !!OPENAI_API_KEY); // This will log true/false without exposing the key
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
    // Mock course recommendations based on career goal
    const mockCourses: Course[] = [
      {
        title: "Introduction to Programming",
        platform: "Coursera",
        rating: 4.8,
        price: "Free",
        url: "https://www.coursera.org/learn/intro-programming",
      },
      {
        title: "Web Development Fundamentals",
        platform: "Coursera",
        rating: 4.6,
        price: "Free",
        url: "https://www.coursera.org/learn/web-development",
      },
      {
        title: "Data Science Essentials",
        platform: "Coursera",
        rating: 4.7,
        price: "Free",
        url: "https://www.coursera.org/learn/data-science",
      },
      {
        title: "UX Design Principles",
        platform: "Coursera",
        rating: 4.5,
        price: "Free",
        url: "https://www.coursera.org/learn/ux-design",
      },
    ];

    // Filter courses based on career goal keywords
    const careerKeywords = careerGoal.toLowerCase().split(" ");
    return mockCourses.filter((course) =>
      careerKeywords.some((keyword) =>
        course.title.toLowerCase().includes(keyword)
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
        <h1>🧠 AI Skill Gap Analyzer</h1>
        <p className="subtitle">Discover your learning path to success</p>
      </header>

      <main className="app-main">
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
                      <div className="rating">
                        <span className="stars">
                          {"★".repeat(Math.floor(course.rating))}
                        </span>
                        <span className="rating-value">{course.rating}</span>
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
      </main>

      <footer className="app-footer">
        <p>Powered by AI to help you achieve your career goals</p>
      </footer>
    </div>
  );
}

export default App;
