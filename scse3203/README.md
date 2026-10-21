# SCSE3203 Special Topics: Week 02 Kit

| Folder | What it is |
|---|---|
| `setup/` | One-click Windows setup: Temurin JDK 21, `JAVA_HOME`, VS Code Java + Spring extension packs, Git, project copy, build, local commit, evidence log |
| `week02-demo/` | The finished lab project (Sections E–H + the SDL `/profile` challenge). Spring Boot 4.1.1, Java 21, Spring Web MVC, Thymeleaf. It builds, and all 5 tests pass. |
| `week02-demo/LAB-ANSWERS.md` | Discussion prompt, exit ticket Q27–30, SDL reflection draft, Section J checklist |
| `project/PROJECT-PLAN.md` | Etiqa group project: name, roles, 8 modules × 4 members, Phase 2 grid, board seed, dates |

## Run it on your PC (about 10 minutes, mostly downloads)

1. Unzip this kit anywhere, for example `Downloads\scse3203`.
2. Double-click **`setup\Setup-SCSE3203.cmd`**. Accept any UAC prompts from the JDK, Git and VS Code installers.
   To set your Git identity in the same run, open PowerShell in `setup\` and run:
   ```powershell
   .\Setup-SCSE3203.cmd -GitName "Your Name" -GitEmail "you@graduate.utm.my"
   ```
3. Open a **new** terminal (PATH changed), then:
   ```powershell
   cd C:\SCSE3203\week02-demo
   code .
   .\mvnw.cmd spring-boot:run
   ```
   Browse to `http://localhost:8080/`, `/about` and `/profile`. Press Ctrl+C to stop.
4. Push to GitHub: create an **empty** repo named `week02-demo` (no README), then run:
   ```powershell
   git remote add origin https://github.com/<you>/week02-demo.git
   git push -u origin main
   ```
   If you use GitHub Classroom, clone the assigned repo instead and copy the project files into it.

## Do the remaining lab steps by hand (they are the graded learning)
- **G2 (port change):** in `application.properties`, uncomment `server.port=8081`, restart, check `http://localhost:8081/`, then comment the line out again.
- **G3 (JAR):** run `.\mvnw.cmd clean package`, then `java -jar target\week02-demo-0.0.1-SNAPSHOT.jar`.
- **Evidence:** take screenshots of the three pages, and keep `C:\SCSE3203\evidence\week02-evidence-*.txt` as your version proof.

## If something fails
| Symptom | Fix |
|---|---|
| `winget` not found | Install **App Installer** from the Microsoft Store and re-run |
| `java` is not 21 in a new terminal | Run `where.exe java`. An older JDK in the *Machine* PATH wins, so move `%JAVA_HOME%\bin` above it in System Environment Variables |
| `mvnw.cmd` download error | Campus proxy or Wi-Fi problem. Retry on another network. The first run needs `repo.maven.apache.org` |
| Port 8080 in use | Run `netstat -ano \| findstr :8080`, then end that PID, or use `server.port` |
| `git push` 403 | Sign in through the browser popup (Git Credential Manager) and check that the repo URL is yours |
