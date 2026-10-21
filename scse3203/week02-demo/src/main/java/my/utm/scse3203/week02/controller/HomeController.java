package my.utm.scse3203.week02.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    // Each method returns a logical view name; Thymeleaf resolves it to
    // src/main/resources/templates/<name>.html and renders HTML on the server.

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/about")
    public String about() {
        return "about";
    }

    // SDL challenge (Section K)
    @GetMapping("/profile")
    public String profile() {
        return "profile";
    }
}
