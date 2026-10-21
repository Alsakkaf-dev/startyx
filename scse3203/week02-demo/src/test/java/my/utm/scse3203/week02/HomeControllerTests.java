package my.utm.scse3203.week02;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;
import static org.hamcrest.Matchers.containsString;

import my.utm.scse3203.week02.controller.HomeController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HomeController.class)
class HomeControllerTests {

    @Autowired
    private MockMvc mvc;

    @Test
    void homeRendersIndexTemplate() throws Exception {
        mvc.perform(get("/"))
            .andExpect(status().isOk())
            .andExpect(view().name("index"))
            .andExpect(content().string(containsString("Welcome to Java Web Development")));
    }

    @Test
    void aboutRendersAboutTemplate() throws Exception {
        mvc.perform(get("/about"))
            .andExpect(status().isOk())
            .andExpect(view().name("about"))
            .andExpect(content().string(containsString("Back to Home")));
    }

    @Test
    void profileRendersProfileTemplate() throws Exception {
        mvc.perform(get("/profile"))
            .andExpect(status().isOk())
            .andExpect(view().name("profile"))
            .andExpect(content().string(containsString("Student Profile")));
    }

    @Test
    void unmappedPathReturns404() throws Exception {
        mvc.perform(get("/aboutus")).andExpect(status().isNotFound());
    }
}
