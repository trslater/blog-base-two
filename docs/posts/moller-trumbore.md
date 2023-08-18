---
draft: true 
date: 2023-08-15
authors:
  - trslater
categories:
  - Explainers
tags:
  - Linear Algebra
  - Computer Graphics
  - SoME
  - SoME3
---

# Möller–Trumbore: Photorealistic Lighting Starts With a Ray and a Triangle

<figure markdown>
  ![An image rendered using path tracing, demonstrating notable features of the technique](../assets/images/moller-trumbore/path-tracing-example.jpg)
  
  <figcaption>"<a href="https://commons.wikimedia.org/wiki/File:Path_tracing_001.png">Path tracing 001.png</a>" by Qutorial is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a> via <a href="https://commons.wikimedia.org/wiki/Main_Page">Wikimedia Commons</a></figcaption>
</figure>

Have you ever wondered how computers produce photorealistic lighting: shading, shadows, reflections, depth of field, etc.? Most commonly, this is done via ray tracing or one of its descendants (e.g., path tracing or photon mapping). The basic idea is to mimic the way rays of light travel around a scene and what colour the ray is when it reaches the eye/camera. There are many ways light rays interact within a scene, but they almost all require knowing *where a ray hits an object*. From this point it can bounce off, refract through, or be used to simulate the effect of many rays spraying in all directions. This article will focus on the most general case: where a ray strikes a triangle. We will start with an intuitive understanding of the problem and work our way up to an elegant and efficient solution: the **Möller–Trumbore** algorithm.

<!-- more -->

!!! note "About This Blog"
    If you are knew to this blog, please consider checking out the ["About This Blog"](../about.md) section.

## Requisite Knowledge

This article should be well understood by anyone with a highschool math education. An understanding of vectors and vector operations (addition, subtraction, dot product, etc.) is probably required as well. There is some linear algebra, but I explain the notation and operations at a high level, and we don't actually perform any computations, so previous knowledge of linear algebra probably isn't necessary, though an understanding of very basic concepts couldn't hurt.

## Discriminating Between Points & Vectors

Something that is not commonly taught unless you are specifically learning about graphics is to consider points and vectors as distinct from one another. Generally, any double or triple can be considered a point or vector interchangeably. I find the distinction to be useful (even when not using homogenous coordinates), especially when modelling physical spaces, as is often the case for computer graphics. I also find that there is a lack of consistent conventions for notation, so I think it is worth providing a primer on how these concepts and notation will be used in this article.

### Notation

The notation I use can be summarize in the following table:

| Quantity | Bold | Italic | Uppercase | Example |
| --- | :---: | :---: | :---: | :---: |
| Scalar | | X | | $t$ |
| Point | | X | X | $P$ |
| Vector | X | | | $\mathbf{u}$ |
| Unit Vector | X | | | $\mathbf{\hat{u}}$ |
| Matrix | X | | X | $\mathbf{A}$ |

### Definitions & Operations

A **vector** is a *direction* and *distance*. More generally, the distance is referred to as "magnitude," but because it is more intuitive when modelling physical spaces, I'll generally refer to the magnitude of a vector as its "distance." Vectors can be added, subtracted, subtracted, multiplied with each other (dot, cross, or matrix multiplication). Vectors can also be scaled by a real number, i.e., a scalar. Finally, we can take the distance of a vector, denoted by $||\mathbf{u}||$.

A **point** is a *location* in space. It has no sense of directionality or distance. The only operation that makes sense between two points is subtraction (think through the other operations and see if you can see why they don't make sense). This results in a vector that represents the distance between two points and the direction from one to the other. This simple relationship encapsulates all the ways points and vectors can be combined:

$$\begin{equation}
    B - A = \mathbf{u}
\end{equation}$$

In this equation, the direction points from $A$ to $B$. Consider the following equations:

$$\begin{gather*}
    B - A = \mathbf{u} \\
    A - B = -\mathbf{u} \\
    ||A - B|| = ||B - A||
\end{gather*}$$

Swapping the minuend and the subtrahend results in a vector pointing in the opposite direction. Note: this is notated with a negative sign (this can be thought of as the vector being scaled by -1). However, the distance between two points is the same whether pointing from $A$ to $B$ or $B$ to $A$. This should all make fairly intuitive sense. If Bob and Alice are standing 10 ft apart, Bob has to run in the opposite direction to reach Alice that Alice would need to run to reach Bob, but their distance from one another is the same from any vantage point.

Vectors are often depicted as arrows originating at the origin, but this is misleading. There isn't a good way to represent a vector by itself in space visually, because they have no location. There are always two implicit points when drawing a vector in a coordinate space. This relationship can be understood better by rearranging the point difference equation from earlier:

$$B = A + \mathbf{u}$$

This equation reads, if we start at position $A$ and travel in direction $\mathbf{\hat{u}}$ for a distance of $||\mathbf{u}||$, we will end up at position $B$. In this sense, $\mathbf{u}$ can be thought of as the path such that if you follow it from $A$ you will arrive at $B$. This may seem pedantic, but isn't that what math is all about? All kidding aside, it matters. For one thing, if we always think of a vector starting at the origin, it can be hard to make sense of vectors that represent things like forces that act on a particular location. Additionally, moving vectors around can give helpful insights to a problem.

Another key relationship to understand is the following:

$$\mathbf{u} = ||\mathbf{u}||\mathbf{\hat{u}}$$

This encapsulates how a vector can be decomposed into distance and direction, a very useful tool to have. Rearranging this also shows us how to compute a unit vector:

$$\mathbf{\hat{u}} = \frac{\mathbf{u}}{||\mathbf{u}||}$$

??? question "Can you divide by a vector?"
    It is interesting to think about the following:

    $$||\mathbf{u}|| = \frac{\mathbf{u}}{\mathbf{\hat{u}}}$$

    Generally, we don't have a notion of dividing by a vector, but here it seems to make sense. I'll leave it to you to ponder.

To me, these two relationships are some of the most useful to keep in mind when working with mathematical models of physical space.

## Why Triangles?

Before we get started, a question might be popping out at you: why does a mesh of triangles represent a general case of an object in a scene? Without getting into too much detail, any 3D surface can be approximated arbitrarily well using a mesh of triangles. Why not rectangles, pentagons, etc.? That is out of the scope of this article, but it has been found to greatly simplify storage and calculations of meshes. What is important for this article is that the vast majority of 3D objects are modelled as meshes of triangles. Therefore, knowing where a ray hits a single triangle is the same as knowing where a ray hits any arbitrary 3D surface. To collect the data of ray collisions across any number of objects and rays is as simple (glossing over some technicalities of course) as iterating over the triangles in a scene for each ray.

## 2D Möller–Trumbore

With all of the preamble out of the way, it is time to start tackling our problem. However, as is usually the case with any math problem, solving a simpler version of problem first is usually helpful in finding the final solution. When it comes to 3D graphics problems, this often means solving its 2D analog. 2D environments are simpler, easier to understand, and require a lot less algebra and computing power when modelling with code. Perhaps most importantly, visual representations are almost always easier to parse. It may seem like extra work, but it often turns out to be less work to start in 2D and translate the solution to 3D than to start in 3D.

### Translating Möller–Trumbore to 2D

At first, it might be tempting to think we can just shoot a 2d ray at a triangle lying in the 2D plane. After all, isn't a triangle already a 2D shape? It is, but we are not simply looking to find an analogous shape, but an analogous problem. For one, in 2D space, the triangle and ray always live on the same plane. This is vanishingly unlikely in 3D and even turns out to be one of our miss conditions! Conceptually, it would be like the ray hitting the triangle directly on the edge, which can't really happen, since in our 3D model, triangles have zero thickness. We could think of the ray hitting just one side of the triangle, but then are we really colliding with a triangle at all? This gives us insight into the shape we're actually looking for. What shape is one side of a triangle (or any polygon for that matter)? A *line segment*.

If we back up to why we are using triangles in the first place, this makes a lot of sense. As alluded to in the intro, we can think of our mesh of triangles as approximating some smooth 3D surface. This discretized the problem into finite objects that are easier to understand and work with. We want an equivalent discretization of a smooth 2D surface (i.e. a curve) into finite simpler to understand 2D shapes. How can we approximate a curve with a finite set of simpler 2D shapes? We can use a set of line segments.

### The Problem

Finally, we're ready to start tackling the 2D analog of the problem. From a high level our problem is simple: *given a ray and a line segment, where does the ray hit a triangle?* But before we can continue, we need to define things more clearly:

-   What is a ray?
-   How do we model it?
-   How do we model a line segment?
-   What does it mean for a ray to hit a line segment?
-   Can a ray hit the same line segment more than once?
-   How do we know if it misses?

### What is a Ray?

A **ray** is simply *a portion of a line that is bounded at one end*. There could be many ways to model a ray mathematically, but to arrive at a model applicable to our problem, we need to consider what it is we know and what it is we are looking for. Generally, we will know where the ray originates, we call this the ray **origin**, denoted by $E$ for eye (in traditional ray tracing rays originate at the eye/camera instead of the light source for reasons outside the scope of this article). We will also know where the ray is point, i.e., the **direction** $\mathbf{\hat{d}}$. We want an expression for an arbitrary point $R$ on the ray, since our problem is to find the *point* at which the ray hits the line segment. To get to any point on the ray, we just have to start at $E$ and travel in the direction $\mathbf{\hat{d}}$ for some distance $t$. This means that every point on our ray is wholly determined by our choice of $t$. We can combine this information with our relationships from [Discriminating Between Points & Vectors](#discriminating-between-points--vectors) to derive a function for any point on the ray in terms of distance from the ray origin:

$$R(t) = E + t\mathbf{\hat{d}}, \quad t \geq 0$$

Note: $t$ is restricted to be non-negative. Distance can never be negative (at least in the way we are modelling space). Pragmatically, this is what makes this a ray and not a line.

We can summarize this equation succinctly: $R$ is the point $t$ units from $E$ in the direction $\mathbf{\hat{d}}$.

One final note about our ray definition: it is possible to use non-unit direction vectors, but this has the problem that there are an infinite number of point–vector pairs that define the same ray. By sticking to unit vectors, every point–unit vector pair *uniquely* defines a ray. Additionally, using unit direction vectors normalizes $t$ to always represent unit direction, no matter the ray. This information can be handy in other contexts. In general, sticking to unit direction vectors for rays simplifies conceptualization and calculation, not just with regards to MT.

### What is a Line Segment?

I think most people are familiar with what a line segment is, so I won't bother redefining it here. However, like with the ray, we're after a particular model of a line segment based on what we know and what we want. Generally, we'll know the two end points, $A$ and $B$, of the line segment (denoted $AB$), and we want to be able to find an arbitrary point $S$, somewhere between between them. Luckily, there is a very well-established way to find an arbitrary point between two other points: **linear interpolation**. We can use it to form a function for an arbitrary point $S$, $u$ percent of the way from $A$ to $B$, in terms of $u$:

$$S(u) = (1 - u)A + uB, \quad 0 \leq u \leq 1$$

??? note "An alternative derivation"
    We could think of this in a similar way to the ray: a **line segment** is *a portion of a line that is bounded at both ends*. Then construct a formula in a similar manner as the ray:

    $$S(s) = A + s\frac{B - A}{||B - A||}, \quad 0 \leq s \leq ||B - A||$$

    This is pretty messy though, and has the disadvantage of making the parameter bounds dependent on the choice of $A$ and $B$. However, with a simple change of variable, we can get the same model as with our linear interpolation approach. Let $u = \frac{s}{||B - A||} \implies s = u||B - A||$.

    $$\begin{align*}
        S(u) &= A + u||B - A||\frac{B - A}{||B - A||}, & 0 \leq u||B - A|| \leq ||B - A|| \\
        &= A + u(B - A), & 0 \leq u \leq 1 \\
        &= A + uB - uA, & 0 \leq u \leq 1 \\
        &= (1 - u)A + uB, & 0 \leq u \leq 1
    \end{align*}$$

As much as I'd love to go into the intuition behind linear interpolation, I can't explain everything, so we'll just take on faith that it works.

As with the ray, it is pretty interesting (and convenient) that the points on the line segment are wholly determined by our choice of $u$.

### What Does it Mean for a Ray to Hit Something?

The key to understanding where a ray hits a line segment (or any object for that matter) is to realize that this point *has* to be both a point on the ray and a point on the line segment. In other words, the points must be equal:

$$R(t) = S(u)$$

This means that we simply need to find the choice of $t$ and $u$ that make the above equation hold. This begs the question, is there only a single $t$–$u$ pair that satisfies this problem?

Recall that both a ray and a segment are portions of a line. As such, each sits on a particular line. Unless these lines are parallel, they cross over each other *exactly once* at a single point. Since our ray and segment represent only a subset of the points of each line, we can conclude that they must also only intersect—if they intersect at all—at a single point.

### How Do We Know If a Ray Misses a Line Segment?

The previous section already all but spelled out our first miss condition: *if the ray and line segment are parallel*.

Also state previously, if they aren't parallel, the lines on which they lie on will *always* intersect at a single "candidate" point. As mentioned above, this candidate point still needs to lie within the ranges of our point functions. This gives two possible miss conditions for our candidate point:

1.  *The candidate is not in the range of $R$*—the candidate point is a negative distance $t$ from (i.e., behind) $E$ relative to direction $\mathbf{\hat{d}}$.
2.  *The candidate is not in the range of $S$*—the candidate is in front (i.e., in the path) of the ray, but it goes past one of the ends of the segment. This happens when either $u < 0$, i.e., passes the $A$ and of the segment; or $u > 1$, i.e., passes the $B$ end of the segment.

Note: these two conditions can happen simultaneously, but usually, you'll check one first—probably $t$—and exit early if a miss is detected.

### A Refined Problem Statement

With all of that out of the way, we can refine our problem to get to what we really want: given a ray defined by a point $E$ and a direction $\mathbf{\hat{d}}$, and a line segment $AB$ defined by points $A$ and $B$, is there a choice of parameters $t$ and $u$ within their respective domains, such that $R(t) = S(u)$.

### The Solution

As stated in the problem, we're looking for $R(t) = S(u)$, so let's start there:

$$\begin{align*}
    R(t) &= S(u) \\
    E + t\mathbf{\hat{d}} &= A + u(B - A) \\
\end{align*}$$

Now, we'll rearrange to get our terms containing unknowns alone on one side of the equation:

$$E - A = t(-\mathbf{\hat{d}}) + u(B - A)$$

!!! note
    I've brought the negative sign inside parentheses with the ray direction. This is to emphasize that the distance is non-negative and that this term is pointing in the opposite direction as the ray.

Let's stop to think about what this equation means. We can think of each side of the equation representing a different path. By setting these paths as equal, we're not saying they travel the same distance, but that they have the same *displacement*, meaning that if a traveler starts down either path from the same location, they will arrive at the same destination. Notice that the LHS explicitly tells us that if we start at $A$, we'll arrive at $E$. That means that if the path defined by the RHS starts at $A$, it too will arrive at $E$. This makes conceptual sense. Imagine we already have the exact $t$ and $u$ of our solution. If we start at $A$ and travel $u$ percent of the way to $B$, we'll be at the intersection point. If we then travel *from* the intersection point $t$ units in the *opposite* direction as the ray, we'll arrive back at $E$, the ray origin. In other words, we've backtracked along the ray from the intersection.

Now the question becomes, how do we solve for $t$ and $u$? Decomposing the vectors into their components reveals that what we actually have is a system of equations:

$$\begin{gather*}
    E_x - A_x = t(-\hat{d}_x) + u(B_x - A_x) \\
    E_y - A_y = t(-\hat{d}_y) + u(B_y - A_y)
\end{gather*}$$

Many of you have encountered such systems of equations in highschool, even if your curriculum didn't cover linear algebra. Those techniques would work here, but we want to avoid algebraic mechanics and look at things more conceptually, so we'll opt for the more revealing perspective that linear algebra provides. Linear algebra gives us a new tool, the **matrix**, which together with matrix–vector multiplication, gives a way to extract the coefficients from a linear combination of vectors:

$$\begin{align*}
    E - A &= \begin{bmatrix}
        | & | \\
        -\mathbf{\hat{d}} & (B - A) \\
        | & | \\
    \end{bmatrix}\begin{bmatrix}
        t \\
        u
    \end{bmatrix} \\
    &= \begin{bmatrix}
        -\hat{d}_x & B_x - A_x \\
        -\hat{d}_y & B_y - A_y \\
    \end{bmatrix}\begin{bmatrix}
        t \\
        u
    \end{bmatrix} \\
    &= \mathbf{M}\begin{bmatrix}
        t \\
        u
    \end{bmatrix}
\end{align*}$$

We can think of multiplying a vector on the left by this matrix as a transformation that transforms a vector in solution space (all possible values of $t$ and $u$) to a vector in physical space. It may not be obvious at first, but the vector $(t, u)$ is the coordinates of the vector $E - A$ in solution space. The convention for denoting this translation between spaces is to define the column vectors of the matrix as a set called a **basis**:

$$\beta = \{-\mathbf{\hat{d}}, B - A\}$$

We can denote $E - A$ in basis $\beta$ as follows as $[E - A]_\beta$. This is called a **change of basis**.

So, we have a way to convert points in solution space into points in physical space. This would be great if we already had a solution, but we want to find the solution. Imagine a function $f$:

$$f(\mathbf{u}) = \mathbf{M}\mathbf{u}$$

If we could find the inverse of this function, then we should be able to move from physical space to solution space. This would let us use what we know about physical space to find a solution:

$$\begin{bmatrix}
    t \\
    u
\end{bmatrix} = f^{-1}(E - A)$$

Luckily, matrices have an analogous idea: the **matrix inverse**:

$$\begin{bmatrix}
    t \\
    u
\end{bmatrix} = \mathbf{M}^{-1}(E - A)$$

We're not going to worry about the mechanics of finding a matrix inverse. There is a plethora of resources on the various methods online. However, it is important to note that an inverse isn't guaranteed. There some conditions (most of which turn out to be equivalent) that have to be met for an inverse to exist. One of the conditions is that the matrix is square. This is a huge topic and we aren't going to go into it here, but it is related to why the 2D analog to a triangle is a segment. We are working in 2D, so the matrix has two rows. Thus, we need two columns, i.e., two basis vectors. Our basis vectors are defined by our ray, and the object it intersects (this will come back later in the 3D version). For this condition to be met, the problem needs to be set up correctly from the beginning.

Another condition for invertibility is that the column vectors be linearly independent. For only two vectors, this is the same as saying they are *not* parallel. Recall this was one of our miss conditions. This gives us our first way to check for a miss: *if we can't find an inverse, the ray misses*.

Our inverse, however, has no sense of our function domains, and as long as our direction is well-defined, $A \neq B$, and $\mathbf{\hat{d}}$ is not parallel to $B - A$, our matrix should have an inverse. This inverse matrix gives us a candidate solution which corresponds to our candidate intersection point. Then, all that is left is checking whether or not $t$ and $u$ are within their respective ranges.

## Translating Back to 3D

Though we started thinking about the problem of triangles in 3D and arrived at a 2D analog involving line segments, translating back to 3D may not naturally lead back to triangles—at least not right away. Let's think about how to most naturally extend the problem we just solved to 3D before moving on to triangles.

??? question "Is 3D ray-segment intersection possible?"
    It turns out that this doesn't work, at least not using the methods in this article. I will leave it as homework to try and figure out why. I'll show you how I think of it in a follow-up post.

Recall our line segment equation:

$$S(u) = A + u(B - A), \quad 0 \leq u \leq 1$$

What is the most natural way to extend this line segment to 3D? To answer this, let's change our perspective on what your line segment is. A line segment lives on a line. Lines in 2D space can be thought of as 1D subspace. When a subspace is one dimension lower than surrounding space, it is called a **hyperplane**. We can then think of a line segment as a hyperplane in 2D that is bounded along its only axis.

In this sense, the natural extension to 3D would be a 2D hyperplane (i.e., a plane) that is bounded along its axes. Think back to our discussion of basis vectors. We have a single basis vector that spans all of 1D space, so to span our plane, we need another, linearly independent basis vector. We could add any vector and a scaling parameter to accomplish this, but since we are working toward a triangle, it makes sense to add a third point $C$ and create our second basis vector relative to it: $C - A$. This gives the following function for our new shape:

$$P(u, v) = A + u(B - A) + v(C - A), \quad 0 \leq u, v \leq 1$$

What is this shape? Let's start following a path around the outside and see if we can figure it out. $P(0, 0) = A$. This will be our starting point. Let's leave $v$ and slowly increase $u$. As $u \to 1$, we travel in a straight line to $B$. Now, slowly increase $v$. As $v \to 1$, we travel along the path $C - A$ toward a new point, we'll call it $D$. Now, we start decreasing $u$ again. This causes us to move toward $C$ along the path $A - B$. Recall, this is just the opposite direction as $B - A$, so is parallel. We arrive at $C$, and if we complete the trip by decreasing $v$, we'll arrive back at $A$. A shape with four points and four sides where opposite sides are parallel. It's a **parallelogram**!

## Parallelogram Möller–Trumbore

Parallelogram MT is almost identical to 2D MT, so we're not going to dwell on the details:

$$\begin{align*}
    R(t) &= T(u, v) \\
    E + t\mathbf{\hat{d}} &= A + u(B - A) + v(C - A) \\
    E - A &= t(-\mathbf{\hat{d}}) + u(B - A) + v(C - A) \\
    &= \begin{bmatrix}
        | & | & | \\
        -\mathbf{\hat{d}} & (B - A) & (C - A) \\
        | & | & |
    \end{bmatrix}\begin{bmatrix}
        t \\
        u \\
        v
    \end{bmatrix} \\
    &= \begin{bmatrix}
        -\hat{d}_x & B_x - A_x & C_x - A_x \\
        -\hat{d}_y & B_y - A_y & C_y - A_y \\
        -\hat{d}_z & B_z - A_z & C_z - A_z
    \end{bmatrix}\begin{bmatrix}
        t \\
        u \\
        v
    \end{bmatrix} \\
    &= \mathbf{M}\begin{bmatrix}
        t \\
        u \\
        v
    \end{bmatrix} \\
    \begin{bmatrix}
        t \\
        u \\
        v
    \end{bmatrix} &= \mathbf{M}^{-1}(E - A) \\
\end{align*}$$

It is then exactly like the 2D, but we have one additional check to make, $v$:

$$t \geq 0, 0 \leq u, v \leq 1$$

Conceptually, everything works very much the same:

-   If the ray and parallelogram are parallel, this is an obvious miss.
-   If they are not, then the line that the ray lies on intersects the plane that the parallelogram lies on in exactly one point. This is a candidate point for an intersection.
-   If the ray is pointing away from the parallelogram it misses. This corresponds to $t$ being negative.
-   If the ray is pointing towards the plane of the parallelogram, but $u$ or $v$ are out of ranges, the ray has missed, but now there are four edges it can pass by instead of two ends.

## Extending to Triangles

Extending to triangles is very simple, but requires some explanation. Imagine we create a new function $\tilde{T}$ based on our parallelogram, but with $u$ fixed at $1 - v$:

$$\tilde{T}(v) = A + (1 - v)(B - A) + v(C - A), \quad 0 \leq v \leq 1$$

Notice this looks a lot like linear interpolation. Imagine starting at $v = 0$. Then, $\tilde{T}(0) = B$. As we increase $v$ from 0 to 1, our $B - A$ vector is scaled down by the same amount $C - A$ is scaled up, so $\tilde{T}$ travels from $B$ to $C$ in a straight line. This line creates a triangle with $AB$ and $AC$. Now, we just need to encorporate the interior points. Let's reintroduce $u$ and shift its relationship to $v$ into a condition:

$$\tilde{T}(u, v) = A + u(B - A) + v(C - A), \quad 0 \leq u, v \leq 1, u + v = 1$$

As long as our $u + v = 1$ condition holds, all points of $\tilde{T}$ will be along the diagonal from $B$ to $C$. Now, consider what happens if we reduce $u$ or $v$. The point gets closer to $A$. Conversely, if we increase $u$ or $v$, the point gets closer to $D$. This tells use that we only have to make sure the sum of $u$ and $v$ never gets *bigger* than 1:

$$T(u, v) = A + u(B - A) + v(C - A), \quad 0 \leq u, v \leq 1, u + v \leq 1$$

And we have a formula for any point on or inside a triangle that mirrors our parallelogram. In fact, it only differs by a single condition.

!!! note
    More commonly, we define $w = 1 - u - v$, and check $w \geq 0$. Why? $u$, $v$, and $w$ define what are called barycentric coordinates. $u$, $v$, and $w$, tell us how close we are to $B$, $C$, and $A$, respectively. I'd like to make a whole post on barycentric coordinates at some point.

## A Basic Python Implementation

!!! warning "This implementation uses numpy"
    You will need to make sure you have numpy installed for this to work

The most common way to handle intersections in ray tracing code is to have the `intersect` function return the value of $t$ associated with the intersection. To recover the point, just use the `at` function, which returns a point on the ray.

Since $t$ must be non-negative, a common way to encode misses is as a -1. However, I prefer to raise an exception, because I find it makes things a lot clearer when the return value of a function only has one meaning. The `intersect` function returns the $t$ value of the intersection. Since -1 is not a valid $t$ value, it is confusing to return this. Instead, since there is no valid $t$ value for a miss, we raise an exception. This is somewhat analogous to a division by zero error.

```py title="mt.py"
import sys

import numpy as np


class DoNotIntersectException(Exception):
    ...


class Triangle:
    def __init__(self, A, B, C) -> None:
        self.A = np.array(A)
        self.B = np.array(B)
        self.C = np.array(C)


class Ray:
    def __init__(self, origin, direction) -> None:
        distance = np.linalg.norm(direction)
        
        # Check direction makes sense
        if distance == 0:
            raise ValueError("Ambiguous direction")
        
        # Assure unit length
        direction /= np.linalg.norm(direction)

        self.origin = np.array(origin)
        self.direction = np.array(direction)

    def intersect(self, object: Triangle) -> float:
        """Given an object, returns the distance from the ray origin to the
        point of intersection with the object."""

        if isinstance(object, Triangle):
            # Create matrix transform from solutions space to physical space
            soln_to_phys = np.column_stack((-self.direction,
                                            object.B - object.A,
                                            object.C - object.A))
            # Attempt to invert
            try:
                phys_to_soln = np.linalg.inv(soln_to_phys)
            
            # Coplanar direction and triangle
            except np.linalg.LinAlgError:
                raise DoNotIntersectException()

            # Transform vector from A to ray origin into solution
            t, u, v = phys_to_soln@(self.origin - object.A)
            w = 1 - u - v

            # Check domains
            if t >= 0 and 0 <= u <= 1 and 0 <= v <= 1 and w <= 1:
                return t
            
        raise DoNotIntersectException()
    
    def at(self, t: float) -> np.ndarray:
        """Given a distance, returns a point at that distance away from the
        origin along the ray."""

        return self.origin + t*self.direction


def main():
    values = tuple(map(float, sys.argv[1:]))

    ray = Ray(origin=values[:3], direction=values[3:6])
    triangle = Triangle(values[6:9], values[9:12], values[12:15])

    print(ray.intersect(triangle))


if __name__ == "__main__":
    main()
```

I have included a very simple CLI to manually test the implementation.

Usage:

```
python mt.py ex ey ez dx dy dz ax ay az bx by bz cx cy cz
```

Example:

```
python mt.py 1 1 1 1 1 2 1 1 2 3 2 2 2 3 3
```

This should return `1.4696938456699067`.
