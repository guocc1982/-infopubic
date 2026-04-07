package com.example.hub;

import org.springblade.core.launch.BladeApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@EnableDiscoveryClient
@SpringBootApplication
public class HubApplication {

	public static void main(String[] args) {
		BladeApplication.run("hub-backend", HubApplication.class, args);
	}

}
