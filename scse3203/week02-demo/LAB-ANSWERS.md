# Week 02 Guided Lab — Answers & Evidence Sheet

> Rewrite every answer in your own words before submitting. The course information sheet treats copied text as plagiarism, and Week 15 requires an AI-use declaration.

## Section J — completion checklist

| Check | How to prove it | Status |
|---|---|---|
| `java -version` / `javac -version` show 21 | `C:\Users\GIGIABYTE\Desktop\Storage\evidence\week02-evidence-*.txt` | ☐ |
| VS Code extensions installed | same log, `code --list-extensions` section | ☐ |
| `mvnw.cmd -version` works | same log | ☐ |
| Spring Boot starts | terminal shows `Tomcat started on port 8080` | ☐ |
| Home page renders | screenshot of `http://localhost:8080/` | ☐ |
| About page + navigation | screenshot of `/about`, click Home ↔ About | ☐ |
| Packaged as JAR | `java -jar target\week02-demo-0.0.1-SNAPSHOT.jar` serves `/` | ☐ |
| Git/GitHub verified | repo shows `pom.xml`, `mvnw.cmd`, `.mvn/`, `src/`; **no** `target/` | ☐ |

Tests verify this automatically: `.\mvnw.cmd test` runs `HomeControllerTests`, which checks `/`, `/about` and `/profile` return 200 with the right view, and that `/aboutus` returns 404.

---

## E. Discussion prompt

**Why does `pom.xml` pull in more libraries than you declared?**
Each starter is itself a Maven artifact with its own `<dependencies>`. `spring-boot-starter-webmvc` declares Spring MVC, Jackson and embedded Tomcat, and each of those declares its own dependencies. Maven walks this graph recursively. That is called *transitive resolution*. It downloads every node into `~/.m2/repository`, and the parent POM (`spring-boot-starter-parent`) pins a tested version for each one. Two starters end up as roughly 40 JARs that are known to work together. That is why nothing is downloaded by hand. To see the tree, run `.\mvnw.cmd dependency:tree`.

**Why must `target/` never be committed?**
`target/` is *derived* output: compiled `.class` files, test reports and a JAR of about 20 MB. Anyone can regenerate it exactly from the source with `mvnw clean package`. Committing it bloats the repository and causes merge conflicts on binary files. It can also leave the build output out of sync with the source, so a stale JAR gets reviewed or deployed. Git should track only the inputs: source, `pom.xml` and the wrapper.

---

## L. Reflection & exit ticket

**27. How do the JDK, Maven, Spring Boot, embedded Tomcat and Thymeleaf work together?**
- **JDK**: `javac` compiles `.java` to bytecode, and the JVM (`java`) runs it.
- **Maven** (through the wrapper): reads `pom.xml`, resolves dependencies, compiles, runs tests and packages one executable JAR.
- **Spring Boot**: `main()` calls `SpringApplication.run`. Boot sees the MVC and Thymeleaf starters on the classpath and auto-configures a DispatcherServlet, a Thymeleaf view resolver and an **embedded Tomcat**.
- **Tomcat**: listens on port 8080 and hands each HTTP request to Spring MVC.
- **Spring MVC**: routes `GET /` to `HomeController.home()`.
- **Thymeleaf**: renders `templates/index.html` into HTML, which goes back to the browser.

You install one tool (the JDK). The others arrive as dependencies inside one process.

**28. Why does `return "index"` render `index.html` instead of sending the text "index"?**
`@Controller` (unlike `@RestController`) treats a returned `String` as a *logical view name*, not as the response body. The `ViewResolver` that Boot auto-configures adds a prefix and suffix, giving `classpath:/templates/` + `index` + `.html`. Thymeleaf renders that file into the response. To send raw text you would need `@ResponseBody` or `@RestController`, which is Week 12 material.

**29. What is the difference between a Git commit and a Git push?**
A **commit** is a snapshot saved in your *local* `.git` history. It works offline, and nobody else sees it. A **push** uploads the commits you have locally but the remote doesn't yet have to the remote (GitHub), so teammates and lecturers can see them. In short: commit = save, push = publish.

**30. Which checkpoint was hardest, and what evidence solved it?**
*Fill this in from your own run.* Example answer: the first `mvnw.cmd -version` failed with a download error. The first meaningful line showed that the Maven distribution URL could not be fetched. Opening the same URL in the browser worked, so the cause was the terminal's proxy settings, not the URL or the wrapper. Fixing the proxy and re-running made `mvnw` download Maven 3.9.11 and report Java 21.

---

## K. SDL challenge — `/profile`

Already implemented:
- `HomeController.profile()` → `@GetMapping("/profile")` returns `"profile"`
- `src/main/resources/templates/profile.html`: a fictional student profile with Home and About links
- No REST or JSON endpoints

**Submission bundle:** repo URL, screenshots of `/`, `/about` and `/profile`, the evidence log, and the reflection below.

### Reflection draft (≈130 words, replace with your own experience)

> After adding `HomeController`, the browser still showed a Whitelabel 404 at `http://localhost:8080/`. Instead of reinstalling anything, I followed the evidence. The console showed that Tomcat had started on 8080, so the server was reachable and the fault was in routing. That meant the problem was the mapping, not the toolchain. I checked the controller's package. It sat outside `my.utm.scse3203.week02`, the package of the main class. Spring Boot only scans the main class's package and its sub-packages, so it never registered my `@GetMapping("/")`. I moved the class into `my.utm.scse3203.week02.controller`, restarted the app, and the page rendered. The lesson was to classify the failure from the first meaningful signal (here, a server that was up but returned 404) and change one variable at a time.

---

## Note on package naming
The worksheet writes `my.utm.SCSE3203`, but the lecture slide "Spring Initializr: shared class configuration" uses `my.utm.scse3203`. This project uses the **lowercase** form, which follows the Java convention that package names are all lowercase. If your lecturer insists on the uppercase form, change the `groupId` in `pom.xml` and rename the folder `src/main/java/my/utm/scse3203` to match.
